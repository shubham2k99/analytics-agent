import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const session = await getIronSession<AppSession>(await cookies(), sessionOptions);
  session.destroy();
  return NextResponse.json({ ok: true });
}
