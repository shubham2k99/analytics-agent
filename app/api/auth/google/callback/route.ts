import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSession } from "@/lib/session";
import { exchangeCodeForTokens, listGA4Properties } from "@/lib/ga4";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = req.cookies.get("oauth_state")?.value;

  if (!code || !state || state !== storedState) {
    return NextResponse.redirect(new URL("/?error=oauth_state_mismatch", req.url));
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const cookieStore = await cookies();
    const session = await getIronSession<AppSession>(cookieStore, sessionOptions);

    session.google = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + tokens.expires_in * 1000,
    };

    try {
      const properties = await listGA4Properties(tokens.access_token);
      if (properties.length === 1) {
        session.propertyId = properties[0].propertyId;
        session.propertyName = properties[0].displayName;
      }
    } catch {
    }

    await session.save();
    cookieStore.delete("oauth_state");
    return NextResponse.redirect(new URL("/", req.url));
  } catch (err: any) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent(err.message)}`, req.url)
    );
  }
}
