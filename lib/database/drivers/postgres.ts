import postgres from "postgres";
import type { DatabaseDriver, DatabaseDriverConfig } from "./types";
import type {
  TableInfo,
  TableSchema,
  QueryParams,
  QueryResult,
  RawQueryResult,
  TestConnectionResult,
  ColumnInfo,
} from "../types";

export class PostgresDriver implements DatabaseDriver {
  private sql: postgres.Sql;

  constructor(config: DatabaseDriverConfig) {
    this.sql = postgres({
      host: config.host,
      port: config.port,
      database: config.database,
      username: config.username,
      password: config.password,
      ssl: config.ssl ? "require" : false,
      max: 1, // Single connection for browsing
      idle_timeout: 30,
      connect_timeout: 10,
    });
  }

  async testConnection(): Promise<TestConnectionResult> {
    try {
      const result = await this.sql`SELECT version()`;
      return {
        success: true,
        version: result[0]?.version as string,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getTables(): Promise<TableInfo[]> {
    const tables = await this.sql`
      SELECT 
        table_schema as schema,
        table_name as name,
        (
          SELECT reltuples::bigint 
          FROM pg_class 
          WHERE oid = (quote_ident(table_schema) || '.' || quote_ident(table_name))::regclass
        ) as row_count
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name
    `;

    return tables.map((t) => ({
      name: t.name as string,
      schema: t.schema as string,
      rowCount: t.row_count ? Number(t.row_count) : undefined,
    }));
  }

  async getSchema(): Promise<TableSchema[]> {
    // Get all columns with their details
    const columns = await this.sql`
      SELECT 
        c.table_schema,
        c.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT kcu.table_schema, kcu.table_name, kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.table_schema = pk.table_schema 
          AND c.table_name = pk.table_name 
          AND c.column_name = pk.column_name
      WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY c.table_schema, c.table_name, c.ordinal_position
    `;

    // Get foreign key relationships
    const foreignKeys = await this.sql`
      SELECT
        tc.table_schema,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
    `;

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
        primaryKey: col.is_primary_key as boolean,
        defaultValue: col.column_default as string | null,
        foreignKey: fk,
      };

      tableMap.get(tableKey)!.columns.push(columnInfo);
    }

    return Array.from(tableMap.values());
  }

  async query(params: QueryParams): Promise<QueryResult> {
    const { table, schema = "public", page, pageSize, sortColumn, sortDirection, filters } = params;
    const offset = (page - 1) * pageSize;

    // Get column info first
    const schemaInfo = await this.getSchema();
    const tableSchema = schemaInfo.find((t) => t.name === table && t.schema === schema);
    const columns = tableSchema?.columns || [];

    // Build the query dynamically
    const tableName = `"${schema}"."${table}"`;

    // Build WHERE clause
    let whereClause = "";
    const whereValues: unknown[] = [];
    if (filters && filters.length > 0) {
      const conditions = filters.map((f, i) => {
        whereValues.push(f.value);
        const col = `"${f.column}"`;
        switch (f.operator) {
          case "eq":
            return `${col} = $${i + 1}`;
          case "neq":
            return `${col} != $${i + 1}`;
          case "gt":
            return `${col} > $${i + 1}`;
          case "gte":
            return `${col} >= $${i + 1}`;
          case "lt":
            return `${col} < $${i + 1}`;
          case "lte":
            return `${col} <= $${i + 1}`;
          case "like":
            return `${col}::text LIKE $${i + 1}`;
          case "ilike":
            return `${col}::text ILIKE $${i + 1}`;
          default:
            return `${col} = $${i + 1}`;
        }
      });
      whereClause = `WHERE ${conditions.join(" AND ")}`;
    }

    // Build ORDER BY clause
    let orderClause = "";
    if (sortColumn) {
      const direction = sortDirection === "desc" ? "DESC" : "ASC";
      orderClause = `ORDER BY "${sortColumn}" ${direction}`;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`;
    const countResult = await this.sql.unsafe(countQuery, whereValues as postgres.ParameterOrJSON<never>[]);
    const totalCount = Number(countResult[0]?.count || 0);

    // Get paginated data
    const dataQuery = `SELECT * FROM ${tableName} ${whereClause} ${orderClause} LIMIT ${pageSize} OFFSET ${offset}`;
    const rows = await this.sql.unsafe(dataQuery, whereValues as postgres.ParameterOrJSON<never>[]);

    return {
      rows: rows as Record<string, unknown>[],
      totalCount,
      columns,
    };
  }

  async executeRawQuery(sqlQuery: string): Promise<RawQueryResult> {
    // Validate that the query is read-only (SELECT only)
    const trimmedQuery = sqlQuery.trim().toLowerCase();
    if (!trimmedQuery.startsWith("select") && !trimmedQuery.startsWith("with")) {
      throw new Error("Only SELECT queries are allowed. INSERT, UPDATE, DELETE, and DDL statements are not permitted.");
    }

    // Check for forbidden keywords that could modify data
    const forbiddenPatterns = [
      /\binsert\b/i,
      /\bupdate\b/i,
      /\bdelete\b/i,
      /\bdrop\b/i,
      /\bcreate\b/i,
      /\balter\b/i,
      /\btruncate\b/i,
      /\bgrant\b/i,
      /\brevoke\b/i,
    ];

    for (const pattern of forbiddenPatterns) {
      if (pattern.test(sqlQuery)) {
        throw new Error("Query contains forbidden keywords. Only SELECT queries are allowed.");
      }
    }

    const startTime = Date.now();
    const rows = await this.sql.unsafe(sqlQuery, []);
    const executionTime = Date.now() - startTime;

    // Extract column information from the result
    const columns: { name: string; type: string }[] = [];
    if (rows.length > 0) {
      const firstRow = rows[0];
      for (const [key, value] of Object.entries(firstRow)) {
        let type = "unknown";
        if (value === null) {
          type = "null";
        } else if (typeof value === "number") {
          type = Number.isInteger(value) ? "integer" : "numeric";
        } else if (typeof value === "string") {
          type = "text";
        } else if (typeof value === "boolean") {
          type = "boolean";
        } else if (value instanceof Date) {
          type = "timestamp";
        } else if (typeof value === "object") {
          type = "json";
        }
        columns.push({ name: key, type });
      }
    }

    return {
      rows: rows as Record<string, unknown>[],
      columns,
      rowCount: rows.length,
      executionTime,
    };
  }

  async close(): Promise<void> {
    await this.sql.end();
  }
}
