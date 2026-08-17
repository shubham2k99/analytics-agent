import { SessionOptions } from "iron-session";

export interface AppSession {
  google?: {
    access_token: string;
    refresh_token?: string;
    expires_at: number; // epoch ms
  };
  propertyId?: string; // selected GA4 property, e.g. "properties/123456789"
  propertyName?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "ga_agent_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

declare module "iron-session" {
  interface IronSessionData extends AppSession {}
}
