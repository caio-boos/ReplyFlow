import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const db = getAdminDb();

  const host = (req.headers.get("host") ?? "").split(":")[0];
  const mainDomain = (process.env.MAIN_DOMAIN ?? "reply.picdev.com.br").split(":")[0];
  const isCustomDomain =
    host !== mainDomain &&
    !host.includes("localhost") &&
    !host.endsWith(".vercel.app");

  let query = db
    .collection("advertorials")
    .where("slug", "==", slug)
    .where("active", "==", true);

  // On custom domains, also verify the domain is registered for this advertorial
  if (isCustomDomain) {
    query = db
      .collection("advertorials")
      .where("customDomain", "==", host)
      .where("slug", "==", slug)
      .where("active", "==", true);
  }

  const snap = await query.limit(1).get();

  if (snap.empty) {
    return new Response("Página não encontrada", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const html = snap.docs[0].data().html as string;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}
