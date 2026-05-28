import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, force } = await req.json();
  if (action !== "fetch-emails" && action !== "process-replies") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const base = req.nextUrl.origin;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });

  const res = await fetch(`${base}/api/cron/${action}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cronSecret}`, "Content-Type": "application/json" },
    body: JSON.stringify({ force: force === true }),
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
