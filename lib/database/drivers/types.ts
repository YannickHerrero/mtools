import type {
  TableInfo,
  TableSchema,
  QueryParams,
  QueryResult,
  RawQueryResult,
  TestConnectionResult,
} from "../types";

export interface DatabaseDriverConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
}

export interface DatabaseDriver {
  /**
   * Test the database connection
   */
  testConnection(): Promise<TestConnectionResult>;

  /**
   * Get list of tables in the database
   */
  getTables(): Promise<TableInfo[]>;

  /**
   * Get schema information for all tables (columns, keys, relationships)
   */
  getSchema(): Promise<TableSchema[]>;

  /**
   * Execute a paginated SELECT query on a table
   */
  query(params: QueryParams): Promise<QueryResult>;

  /**
   * Execute a raw SQL query (read-only SELECT queries only)
   */
  executeRawQuery(sql: string): Promise<RawQueryResult>;

  /**
   * Close the connection
   */
  close(): Promise<void>;
}
