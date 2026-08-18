import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSession } from "@/lib/session";
import { getValidAccessToken, listGA4Properties } from "@/lib/ga4";

export async function GET(req: NextRequest) {
  const session = await getIronSession<AppSession>(await cookies(), sessionOptions);

  if (!session.google) {
    return NextResponse.json({ connected: false });
  }

  try {
    const accessToken = await getValidAccessToken(session);
    await session.save(); // persist any token refresh
    const properties = await listGA4Properties(accessToken);
    return NextResponse.json({
      connected: true,
      properties,
      selectedPropertyId: session.propertyId ?? null,
      selectedPropertyName: session.propertyName ?? null,
      hasAnthropicKey: Boolean(session.anthropicApiKey || process.env.ANTHROPIC_API_KEY),
      usingOwnKey: Boolean(session.anthropicApiKey),
    });
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message });
  }
}

// Select which GA4 property to query
export async function POST(req: NextRequest) {
  const { propertyId, propertyName } = await req.json();
  const session = await getIronSession<AppSession>(await cookies(), sessionOptions);
  session.propertyId = propertyId;
  session.propertyName = propertyName;
  await session.save();
  return NextResponse.json({ ok: true });
}
