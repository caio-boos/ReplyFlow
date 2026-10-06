import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getReplicateStatus, setReplicateToken } from "@/lib/settings/integrations";
import { verifyReplicateToken } from "@/lib/video/replicate";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getReplicateStatus(session.uid);
  return NextResponse.json({
    replicate: { ...status, fromEnv: Boolean(process.env.REPLICATE_API_TOKEN) },
  });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { replicateToken } = await req.json();
  if (typeof replicateToken !== "string" || !replicateToken.trim()) {
    return NextResponse.json({ error: "Informe o token." }, { status: 400 });
  }

  try {
    const username = await verifyReplicateToken(replicateToken.trim());
    await setReplicateToken(session.uid, replicateToken.trim(), username);
    return NextResponse.json({ ok: true, username });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Token inválido." },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await setReplicateToken(session.uid, null);
  return NextResponse.json({ ok: true });
}
