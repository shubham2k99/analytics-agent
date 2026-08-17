import { AppSession } from "./session";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GA_ADMIN_URL = "https://analyticsadmin.googleapis.com/v1beta";
const GA_DATA_URL = "https://analyticsdata.googleapis.com/v1beta";

const SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"];

export function getOAuthRedirectUrl(state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID as string,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI as string,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES.join(" "),
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI as string,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token exchange failed: ${await res.text()}`);
  }
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    id_token?: string;
  }>;
}

async function refreshAccessToken(refresh_token: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID as string,
      client_secret: process.env.GOOGLE_CLIENT_SECRET as string,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${await res.text()}`);
  }
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

/**
 * Returns a valid access token, refreshing it (and mutating the session
 * object in place) if it has expired. Caller is responsible for saving
 * the session after this if it was refreshed.
 */
export async function getValidAccessToken(session: AppSession): Promise<string> {
  if (!session.google) throw new Error("Not connected to Google Analytics");

  const isExpired = Date.now() > session.google.expires_at - 60_000; // 60s buffer
  if (isExpired) {
    if (!session.google.refresh_token) {
      throw new Error("Access token expired and no refresh token available. Please reconnect.");
    }
    const refreshed = await refreshAccessToken(session.google.refresh_token);
    session.google.access_token = refreshed.access_token;
    session.google.expires_at = Date.now() + refreshed.expires_in * 1000;
  }
  return session.google.access_token;
}

export interface GA4Property {
  propertyId: string; // "properties/123456"
  displayName: string;
  accountName: string;
}

export async function listGA4Properties(accessToken: string): Promise<GA4Property[]> {
  const res = await fetch(`${GA_ADMIN_URL}/accountSummaries?pageSize=200`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Failed to list GA4 properties: ${await res.text()}`);
  const data = await res.json();
  const properties: GA4Property[] = [];
  for (const account of data.accountSummaries ?? []) {
    for (const p of account.propertySummaries ?? []) {
      properties.push({
        propertyId: p.property, // e.g. "properties/123456"
        displayName: p.displayName,
        accountName: account.displayName,
      });
    }
  }
  return properties;
}

export interface RunReportArgs {
  propertyId: string; // "properties/123456"
  dateRanges: { startDate: string; endDate: string; name?: string }[];
  metrics: string[]; // e.g. ["activeUsers", "sessions"]
  dimensions?: string[]; // e.g. ["date", "country"]
  limit?: number;
  orderBys?: { metric?: string; dimension?: string; desc?: boolean }[];
}

export async function runGA4Report(accessToken: string, args: RunReportArgs) {
  const body = {
    dateRanges: args.dateRanges,
    metrics: args.metrics.map((name) => ({ name })),
    dimensions: (args.dimensions ?? []).map((name) => ({ name })),
    limit: args.limit ?? 50,
    orderBys: args.orderBys?.map((o) => ({
      metric: o.metric ? { metricName: o.metric } : undefined,
      dimension: o.dimension ? { dimensionName: o.dimension } : undefined,
      desc: o.desc ?? true,
    })),
  };

  const res = await fetch(`${GA_DATA_URL}/${args.propertyId}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GA4 runReport failed: ${await res.text()}`);
  const data = await res.json();

  // Flatten into an array of row objects for easier downstream use.
  const dimHeaders: string[] = (data.dimensionHeaders ?? []).map((h: any) => h.name);
  const metricHeaders: string[] = (data.metricHeaders ?? []).map((h: any) => h.name);
  const rows = (data.rows ?? []).map((row: any) => {
    const obj: Record<string, string | number> = {};
    row.dimensionValues?.forEach((v: any, i: number) => (obj[dimHeaders[i]] = v.value));
    row.metricValues?.forEach((v: any, i: number) => {
      const num = Number(v.value);
      obj[metricHeaders[i]] = Number.isNaN(num) ? v.value : num;
    });
    return obj;
  });

  return {
    rowCount: data.rowCount ?? rows.length,
    dimensionHeaders: dimHeaders,
    metricHeaders,
    rows,
  };
}
