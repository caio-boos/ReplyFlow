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

  const rawHtml = snap.docs[0].data().html as string;

  // Force visibility of elements that Shopify themes hide until their JS runs.
  // Injected right before </head> so it overrides theme CSS.
  const fixCss = `<style id="rf-visibility-fix">
.scroll-trigger,.animate--fade-in,.animate--slide-in,.animate--zoom-in,[class*="scroll-trigger"]{opacity:1!important;visibility:visible!important;transform:none!important;animation:none!important;transition:none!important;}
body,html{opacity:1!important;visibility:visible!important;}
</style>`;

  const html = rawHtml.includes("</head>")
    ? rawHtml.replace("</head>", fixCss + "</head>")
    : fixCss + rawHtml;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
    },
  });
}
