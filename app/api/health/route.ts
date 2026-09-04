import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    app: "AN MedCare POS",
    owner: "Adil Nawaz",
    location: "Swabi, KPK, Pakistan",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  })
}
