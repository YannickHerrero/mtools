import type { DatabaseProvider } from "../types";
import type { DatabaseDriver, DatabaseDriverConfig } from "./types";
import { PostgresDriver } from "./postgres";
import { MySQLDriver } from "./mysql";

export type { DatabaseDriver, DatabaseDriverConfig } from "./types";

/**
 * Factory function to create a database driver based on the provider
 */
export function createDriver(
  provider: DatabaseProvider,
  config: DatabaseDriverConfig
): DatabaseDriver {
  switch (provider) {
    case "postgresql":
      return new PostgresDriver(config);
    case "mysql":
    case "mariadb":
      return new MySQLDriver(config);
    default:
      throw new Error(`Unsupported database provider: ${provider}`);
  }
}
