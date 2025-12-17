import { NextRequest, NextResponse } from "next/server";
import { decrypt, isEncryptionConfigured } from "@/lib/database/crypto";

export async function POST(request: NextRequest) {
  try {
    if (!isEncryptionConfigured()) {
      return NextResponse.json(
        { error: "DATABASE_ENCRYPTION_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { encryptedValue } = body;

    if (!encryptedValue) {
      return NextResponse.json(
        { error: "encryptedValue is required" },
        { status: 400 }
      );
    }

    const decryptedValue = decrypt(encryptedValue);

    return NextResponse.json({ decryptedValue });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Decryption failed" },
      { status: 500 }
    );
  }
}
