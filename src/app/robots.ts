import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const PRIVATE_PATHS = [
  "/api/",
  "/dashboard",
  "/accounts",
  "/conversas",
  "/customers",
  "/context",
  "/emails",
  "/products",
  "/remarketing",
  "/stats",
  "/tasks",
  "/advertorials",
  "/templates",
  "/ferramentas",
  "/membros",
  "/anotacoes",
  "/perfil",
  "/planos",
  "/sem-acesso",
  "/convite/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: PRIVATE_PATHS,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
