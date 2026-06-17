import { NextResponse } from "next/server";
import { getMachineId } from "@/lib/license";

export async function GET() {
  const machineId = getMachineId();
  return NextResponse.json({ machineId });
}
