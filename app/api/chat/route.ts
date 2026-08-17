import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, AppSession } from "@/lib/session";
import { runAgent, ChatTurn } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const { message, history } = (await req.json()) as {
    message: string;
    history: ChatTurn[];
  };

  const session = await getIronSession<AppSession>(await cookies(), sessionOptions);

  if (!session.google) {
    return NextResponse.json(
      { error: "Not connected to Google Analytics. Please connect first." },
      { status: 401 }
    );
  }

  try {
    const result = await runAgent(session, history ?? [], message);
    await session.save();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
