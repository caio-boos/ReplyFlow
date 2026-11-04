import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getReplicateStatus, setReplicateToken } from "@/lib/settings/integrations";
import { verifyReplicateToken } from "@/lib/video/replicate";
import { videoErrorMessage } from "@/lib/video/errors";
import { getT } from "@/lib/i18n/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    const tc = await getT("common");
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });
  }

  const status = await getReplicateStatus(session.uid);
  return NextResponse.json({
    replicate: { ...status, fromEnv: Boolean(process.env.REPLICATE_API_TOKEN) },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    const tc = await getT("common");
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });
  }

  const t = await getT("settings");
  const { replicateToken } = await req.json();
  if (typeof replicateToken !== "string" || !replicateToken.trim()) {
    return NextResponse.json({ error: t("integrations.errors.tokenRequired") }, { status: 400 });
  }

  try {
    const username = await verifyReplicateToken(replicateToken.trim());
    await setReplicateToken(session.uid, replicateToken.trim(), username);
    return NextResponse.json({ ok: true, username });
  } catch (err) {
    return NextResponse.json(
      { error: videoErrorMessage(await getT("tools"), err, t("integrations.errors.invalidToken")) },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) {
    const tc = await getT("common");
    return NextResponse.json({ error: tc("states.unauthorized") }, { status: 401 });
  }

  await setReplicateToken(session.uid, null);
  return NextResponse.json({ ok: true });
}
