import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "ReplyFlow — Respostas automáticas de e-mail com IA para lojas Shopify";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = await readFile(join(process.cwd(), "public/images/logo-icon.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "radial-gradient(ellipse at 50% -10%, #064e3b 0%, #09090b 60%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <img src={logoSrc} width={96} height={96} alt="" />
          <div style={{ fontSize: 64, fontWeight: 800 }}>ReplyFlow</div>
        </div>
        <div style={{ marginTop: 48, fontSize: 52, fontWeight: 800, lineHeight: 1.15 }}>
          Respostas automáticas de e-mail com IA
        </div>
        <div style={{ marginTop: 20, fontSize: 32, color: "#34d399" }}>
          Evite chargebacks e recupere carrinhos na sua loja Shopify
        </div>
      </div>
    ),
    size,
  );
}
