import mariadb from "mariadb";
import type { DatabaseDriver, DatabaseDriverConfig } from "./types";
import type {
  TableInfo,
  TableSchema,
  QueryParams,
  QueryResult,
  TestConnectionResult,
  ColumnInfo,
} from "../types";

export class MySQLDriver implements DatabaseDriver {
  private pool: mariadb.Pool;
  private database: string;

  constructor(config: DatabaseDriverConfig) {
    this.database = config.database;
    this.pool = mariadb.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.username,
      password: config.password,
      ssl: config.ssl ? true : false,
      connectionLimit: 1,
      connectTimeout: 10000,
    });
  }

  async testConnection(): Promise<TestConnectionResult> {
    let conn: mariadb.PoolConnection | undefined;
    try {
      conn = await this.pool.getConnection();
      const rows = await conn.query("SELECT VERSION() as version");
      return {
        success: true,
        version: rows[0]?.version as string,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      if (conn) conn.release();
    }
  }

  async getTables(): Promise<TableInfo[]> {
    let conn: mariadb.PoolConnection | undefined;
    try {
      conn = await this.pool.getConnection();
      const tables = await conn.query(`
        SELECT 
          TABLE_SCHEMA as \`schema\`,
          TABLE_NAME as name,
          TABLE_ROWS as row_count
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
          AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `, [this.database]);

      return tables.map((t: Record<string, unknown>) => ({
        name: t.name as string,
        schema: t.schema as string,
        rowCount: t.row_count ? Number(t.row_count) : undefined,
      }));
    } finally {
      if (conn) conn.release();
    }
  }

  async getSchema(): Promise<TableSchema[]> {
    let conn: mariadb.PoolConnection | undefined;
    try {
      conn = await this.pool.getConnection();

      // Get all columns with their details
      const columns = await conn.query(`
        SELECT 
          c.TABLE_SCHEMA as table_schema,
          c.TABLE_NAME as table_name,
          c.COLUMN_NAME as column_name,
          c.DATA_TYPE as data_type,
          c.IS_NULLABLE as is_nullable,
          c.COLUMN_DEFAULT as column_default,
          CASE WHEN c.COLUMN_KEY = 'PRI' THEN 1 ELSE 0 END as is_primary_key
        FROM information_schema.COLUMNS c
        WHERE c.TABLE_SCHEMA = ?
        ORDER BY c.TABLE_SCHEMA, c.TABLE_NAME, c.ORDINAL_POSITION
      `, [this.database]);

      // Get foreign key relationships
      const foreignKeys = await conn.query(`
        SELECT
          kcu.TABLE_SCHEMA as table_schema,
          kcu.TABLE_NAME as table_name,
          kcu.COLUMN_NAME as column_name,
          kcu.REFERENCED_TABLE_SCHEMA as foreign_table_schema,
          kcu.REFERENCED_TABLE_NAME as foreign_table_name,
          kcu.REFERENCED_COLUMN_NAME as foreign_column_name
        FROM information_schema.KEY_COLUMN_USAGE kcu
        WHERE kcu.TABLE_SCHEMA = ?
          AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
      `, [this.database]);

      // Build FK lookup map
      const fkMap = new Map<string, { table: string; column: string; schema: string }>();
      for (const fk of foreignKeys) {
        const key = `${fk.table_schema}.${fk.table_name}.${fk.column_name}`;
        fkMap.set(key, {
          table: fk.foreign_table_name as string,
          column: fk.foreign_column_name as string,
          schema: fk.foreign_table_schema as string,
        });
      }

      // Group columns by table
      const tableMap = new Map<string, TableSchema>();
      for (const col of columns) {
        const tableKey = `${col.table_schema}.${col.table_name}`;
        if (!tableMap.has(tableKey)) {
          tableMap.set(tableKey, {
            name: col.table_name as string,
            schema: col.table_schema as string,
            columns: [],
          });
        }

        const fkKey = `${col.table_schema}.${col.table_name}.${col.column_name}`;
        const fk = fkMap.get(fkKey);

        const columnInfo: ColumnInfo = {
          name: col.column_name as string,
          type: col.data_type as string,
          nullable: col.is_nullable === "YES",
          primaryKey: Boolean(col.is_primary_key),
          defaultValue: col.column_default as string | null,
          foreignKey: fk,
        };

        tableMap.get(tableKey)!.columns.push(columnInfo);
      }

      return Array.from(tableMap.values());
    } finally {
      if (conn) conn.release();
    }
  }

  async query(params: QueryParams): Promise<QueryResult> {
    const { table, page, pageSize, sortColumn, sortDirection, filters } = params;
    const offset = (page - 1) * pageSize;

    let conn: mariadb.PoolConnection | undefined;
    try {
      conn = await this.pool.getConnection();

      // Get column info first
      const schemaInfo = await this.getSchema();
      const tableSchema = schemaInfo.find((t) => t.name === table);
      const columns = tableSchema?.columns || [];

      // Build the query dynamically
      const tableName = `\`${this.database}\`.\`${table}\``;

      // Build WHERE clause
      let whereClause = "";
      const whereValues: unknown[] = [];
      if (filters && filters.length > 0) {
        const conditions = filters.map((f) => {
          whereValues.push(f.value);
          const col = `\`${f.column}\``;
          switch (f.operator) {
            case "eq":
              return `${col} = ?`;
            case "neq":
              return `${col} != ?`;
            case "gt":
              return `${col} > ?`;
            case "gte":
              return `${col} >= ?`;
            case "lt":
              return `${col} < ?`;
            case "lte":
              return `${col} <= ?`;
            case "like":
              return `${col} LIKE ?`;
            case "ilike":
              return `LOWER(${col}) LIKE LOWER(?)`;
            default:
              return `${col} = ?`;
          }
        });
        whereClause = `WHERE ${conditions.join(" AND ")}`;
      }

      // Build ORDER BY clause
      let orderClause = "";
      if (sortColumn) {
        const direction = sortDirection === "desc" ? "DESC" : "ASC";
        orderClause = `ORDER BY \`${sortColumn}\` ${direction}`;
      }

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`;
      const countResult = await conn.query(countQuery, whereValues);
      const totalCount = Number(countResult[0]?.count || 0);

      // Get paginated data
      const dataQuery = `SELECT * FROM ${tableName} ${whereClause} ${orderClause} LIMIT ? OFFSET ?`;
      const rows = await conn.query(dataQuery, [...whereValues, pageSize, offset]);

      // Remove the 'meta' property that mariadb adds to results
      const cleanRows = Array.isArray(rows) ? rows.filter((r: unknown) => typeof r === 'object' && r !== null) : [];

      return {
        rows: cleanRows as Record<string, unknown>[],
        totalCount,
        columns,
      };
    } finally {
      if (conn) conn.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
