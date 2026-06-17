import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  try {
    // Run prisma db push to create/update the SQLite schema
    try {
      execSync("npx prisma db push --skip-generate", {
        env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
        timeout: 60000,
        stdio: 'pipe',
      });
    } catch (pushErr) {
      console.warn("prisma db push warning:", pushErr);
    }

    // Now test the connection
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json({ connected: true });
  } catch (error) {
    return NextResponse.json({ connected: false, error: String(error) });
  }
}
