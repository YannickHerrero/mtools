export type DatabaseProvider = "postgresql" | "mysql" | "mariadb";

export interface SSHTunnelConfig {
  enabled: boolean;
  host: string;           // SSH server hostname/IP
  port: number;           // SSH port (default: 22)
  username: string;       // SSH username
  privateKey: string;     // PEM-encoded private key (encrypted when stored)
  passphrase?: string;    // Optional passphrase for encrypted keys (encrypted when stored)
}

export interface SSHTunnelInput {
  enabled: boolean;
  host: string;
  port: number;
  username: string;
  privateKey: string;     // Plain text from form
  passphrase?: string;    // Plain text from form
}

export interface DatabaseConnection {
  id?: number;
  name: string;
  provider: DatabaseProvider;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string; // Encrypted when stored
  sslEnabled: boolean;
  sshTunnel?: SSHTunnelConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface DatabaseConnectionInput {
  name: string;
  provider: DatabaseProvider;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string; // Plain text from form
  sslEnabled: boolean;
  sshTunnel?: SSHTunnelInput;
}

export interface TableInfo {
  name: string;
  schema: string;
  rowCount?: number;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue: string | null;
  foreignKey?: {
    table: string;
    column: string;
    schema?: string;
  };
}

export interface TableSchema {
  name: string;
  schema: string;
  columns: ColumnInfo[];
}

export interface QueryFilter {
  column: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike";
  value: string;
}

export interface QueryParams {
  table: string;
  schema?: string;
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  filters?: QueryFilter[];
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  totalCount: number;
  columns: ColumnInfo[];
}

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  version?: string;
}

// Default ports for each provider
export const DEFAULT_PORTS: Record<DatabaseProvider, number> = {
  postgresql: 5432,
  mysql: 3306,
  mariadb: 3306,
};

export const PROVIDER_LABELS: Record<DatabaseProvider, string> = {
  postgresql: "PostgreSQL",
  mysql: "MySQL",
  mariadb: "MariaDB",
};
