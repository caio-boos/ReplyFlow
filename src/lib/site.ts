/** URL pública canônica do site (usada em SEO: metadata, robots, sitemap). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://reply.picdev.com.br").replace(
  /\/+$/,
  "",
);

export const SITE_NAME = "ReplyFlow";
