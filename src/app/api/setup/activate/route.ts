import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateLicenseKey, getMachineId } from "@/lib/license";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body as { key: string };

    if (!key) {
      return NextResponse.json({ error: "License key is required" }, { status: 400 });
    }

    const machineId = getMachineId();
    const isValid = validateLicenseKey(key, machineId);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid license key for this device. Please contact Zenthoz Technologies with your Device ID." },
        { status: 400 }
      );
    }

    const existing = await prisma.systemSettings.findFirst();
    if (existing) {
      await prisma.systemSettings.update({
        where: { id: existing.id },
        data: {
          licenseKey: key.trim().toUpperCase(),
          licenseActivatedAt: new Date(),
          licenseType: "ACTIVATED",
        },
      });
    } else {
      await prisma.systemSettings.create({
        data: {
          licenseKey: key.trim().toUpperCase(),
          licenseActivatedAt: new Date(),
          licenseType: "ACTIVATED",
        },
      });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set("pos-licensed", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("[setup/activate] error:", error);
    return NextResponse.json({ error: "Failed to activate license" }, { status: 500 });
  }
}
