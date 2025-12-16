import { createTunnel } from "tunnel-ssh";
import { Client } from "ssh2";
import type { Server } from "net";

export interface SSHTunnelOptions {
  sshHost: string;
  sshPort: number;
  sshUsername: string;
  privateKey: string;
  passphrase?: string;
  dbHost: string;
  dbPort: number;
}

export interface TunnelResult {
  server: Server;
  localPort: number;
}

/**
 * Creates an SSH tunnel to access a remote database
 * @param options SSH tunnel configuration
 * @returns Object containing the server instance and the local port to connect to
 */
export async function createSSHTunnel(
  options: SSHTunnelOptions
): Promise<TunnelResult> {
  const { sshHost, sshPort, sshUsername, privateKey, passphrase, dbHost, dbPort } =
    options;

  const [server] = await createTunnel(
    { autoClose: true, reconnectOnError: false },
    { port: 0 }, // Let OS assign random available port
    {
      host: sshHost,
      port: sshPort,
      username: sshUsername,
      privateKey,
      passphrase,
    },
    {
      srcAddr: "127.0.0.1",
      srcPort: 0, // Will use server's port
      dstAddr: dbHost,
      dstPort: dbPort,
    }
  );

  const address = server.address();
  const localPort = typeof address === "object" && address ? address.port : 0;

  if (!localPort) {
    throw new Error("Failed to get local port for SSH tunnel");
  }

  return { server, localPort };
}

/**
 * Closes an SSH tunnel
 * @param server The server instance returned from createSSHTunnel
 */
export async function closeTunnel(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err?: Error) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Tests SSH connection without forwarding to a database
 * @param options SSH connection options
 * @returns Success status and any error message
 */
export async function testSSHConnection(options: {
  host: string;
  port: number;
  username: string;
  privateKey: string;
  passphrase?: string;
}): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const conn = new Client();

    const timeout = setTimeout(() => {
      conn.end();
      resolve({ success: false, error: "SSH connection timeout" });
    }, 10000);

    conn.on("ready", () => {
      clearTimeout(timeout);
      conn.end();
      resolve({ success: true });
    });

    conn.on("error", (err: Error) => {
      clearTimeout(timeout);
      resolve({ success: false, error: err.message });
    });

    conn.connect({
      host: options.host,
      port: options.port,
      username: options.username,
      privateKey: options.privateKey,
      passphrase: options.passphrase,
    });
  });
}
