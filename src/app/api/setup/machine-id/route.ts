import { NextResponse } from "next/server";
import { getMachineIdFromEnv } from "@/lib/license";

export async function GET() {
  const machineId = getMachineIdFromEnv();
  return NextResponse.json({ machineId });
}
