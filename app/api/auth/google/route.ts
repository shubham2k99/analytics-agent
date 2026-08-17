import { NextRequest, NextResponse } from "next/server";
import { getOAuthRedirectUrl } from "@/lib/ga4";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const state = crypto.randomBytes(16).toString("hex");
  const url = getOAuthRedirectUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", state, { httpOnly: true, maxAge: 600, sameSite: "lax" });
  return res;
}
