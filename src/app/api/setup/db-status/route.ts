import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  try {
    // Push the SQLite schema (creates the .db file and all tables if not exist)
    try {
      execSync("npx prisma db push --skip-generate --accept-data-loss", {
        env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
        timeout: 60000,
        stdio: "pipe",
      });
    } catch (pushErr) {
      console.warn("[db-status] db push warning:", String(pushErr).slice(0, 200));
    }

    // Test connection
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ connected: true });
  } catch (error) {
    console.error("[setup/db-status] error:", error);
    return NextResponse.json({ connected: false, error: String(error).slice(0, 300) });
  }
}
