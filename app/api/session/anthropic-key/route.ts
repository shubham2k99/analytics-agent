import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { anthropicApiKey } = await req.json();
  if (typeof anthropicApiKey !== "string" || !anthropicApiKey.startsWith("sk-ant-")) {
    return NextResponse.json({ error: "That doesn't look like a valid Anthropic key." }, { status: 400 });
  }
  const session = await getIronSession<AppSession>(await cookies(), sessionOptions);
  session.anthropicApiKey = anthropicApiKey;
  await session.save();
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getIronSession<AppSession>(await cookies(), sessionOptions);
  delete session.anthropicApiKey;
  await session.save();
  return NextResponse.json({ ok: true });
}
