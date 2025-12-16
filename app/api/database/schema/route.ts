import { NextRequest, NextResponse } from "next/server";
import { createDriver } from "@/lib/database/drivers";
import { decrypt, isEncryptionConfigured } from "@/lib/database/crypto";
import { createSSHTunnel, closeTunnel } from "@/lib/database/ssh-tunnel";
import type { DatabaseProvider, SSHTunnelConfig } from "@/lib/database/types";
import type { Server } from "net";

export async function POST(request: NextRequest) {
  let driver = null;
  let tunnel: { server: Server; localPort: number } | null = null;

  try {
    if (!isEncryptionConfigured()) {
      return NextResponse.json(
        { error: "DATABASE_ENCRYPTION_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { provider, host, port, database, username, password, sslEnabled, sshTunnel } = body;

    if (!provider || !host || !port || !database || !username || !password) {
      return NextResponse.json(
        { error: "Missing required connection parameters" },
        { status: 400 }
      );
    }

    // Decrypt password
    let plainPassword = password;
    try {
      plainPassword = decrypt(password);
    } catch {
      plainPassword = password;
    }

    // Handle SSH tunnel if enabled
    let dbHost = host;
    let dbPort = Number(port);

    if (sshTunnel?.enabled) {
      const tunnelConfig = sshTunnel as SSHTunnelConfig;
      
      // Decrypt SSH credentials
      let privateKey = tunnelConfig.privateKey;
      try {
        privateKey = decrypt(privateKey);
      } catch {
        // Might be plain text
      }

      let passphrase = tunnelConfig.passphrase;
      if (passphrase) {
        try {
          passphrase = decrypt(passphrase);
        } catch {
          // Might be plain text
        }
      }

      tunnel = await createSSHTunnel({
        sshHost: tunnelConfig.host,
        sshPort: tunnelConfig.port,
        sshUsername: tunnelConfig.username,
        privateKey,
        passphrase,
        dbHost: host,
        dbPort: Number(port),
      });

      dbHost = "127.0.0.1";
      dbPort = tunnel.localPort;
    }

    driver = createDriver(provider as DatabaseProvider, {
      host: dbHost,
      port: dbPort,
      database,
      username,
      password: plainPassword,
      ssl: Boolean(sslEnabled),
    });

    const schema = await driver.getSchema();

    return NextResponse.json({ schema });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch schema" },
      { status: 500 }
    );
  } finally {
    if (driver) {
      try {
        await driver.close();
      } catch {
        // Ignore close errors
      }
    }
    if (tunnel) {
      try {
        await closeTunnel(tunnel.server);
      } catch {
        // Ignore close errors
      }
    }
  }
}
