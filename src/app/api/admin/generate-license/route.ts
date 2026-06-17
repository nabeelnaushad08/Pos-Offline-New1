import { NextRequest, NextResponse } from "next/server";
import { generateLicenseKey } from "@/lib/license";

const MASTER_PASSWORD = process.env.ZENTHOZ_MASTER_PASSWORD || "zenthoz-admin-2024";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { machineId, masterPassword } = body as { machineId: string; masterPassword: string };

    if (!machineId || !masterPassword) {
      return NextResponse.json(
        { error: "machineId and masterPassword are required" },
        { status: 400 }
      );
    }

    if (masterPassword !== MASTER_PASSWORD) {
      return NextResponse.json({ error: "Invalid master password" }, { status: 403 });
    }

    const normalizedId = machineId.trim().toUpperCase();
    const licenseKey = generateLicenseKey(normalizedId);

    return NextResponse.json({ machineId: normalizedId, licenseKey });
  } catch (error) {
    console.error("[admin/generate-license] error:", error);
    return NextResponse.json({ error: "Failed to generate license key" }, { status: 500 });
  }
}
