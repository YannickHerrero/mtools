import { NextRequest, NextResponse } from "next/server";
import { encrypt, isEncryptionConfigured } from "@/lib/database/crypto";

export async function POST(request: NextRequest) {
  try {
    if (!isEncryptionConfigured()) {
      return NextResponse.json(
        { error: "DATABASE_ENCRYPTION_KEY environment variable is not set" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    const encryptedPassword = encrypt(password);

    return NextResponse.json({ encryptedPassword });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Encryption failed" },
      { status: 500 }
    );
  }
}
