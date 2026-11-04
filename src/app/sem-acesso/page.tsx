import Link from "next/link";
import { getT } from "@/lib/i18n/server";

const REASONS: Record<string, "subscription" | "plan"> = {
  assinatura: "subscription",
  plano: "plan",
};

export default async function SemAcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ motivo?: string }>;
}) {
  const { motivo } = await searchParams;
  const t = await getT("auth");
  const reason = (motivo && Object.hasOwn(REASONS, motivo) && REASONS[motivo]) || "none";
  const message = {
    title: t(`noAccess.${reason}.title`),
    body: t(`noAccess.${reason}.body`),
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-8 text-center">
        <h1 className="text-base font-semibold text-white">{message.title}</h1>
        <p className="mt-2 text-sm text-gray-400">{message.body}</p>
        <Link
          href={motivo === "plano" ? "/dashboard" : "/login"}
          className="mt-6 inline-block text-sm text-indigo-400 hover:text-indigo-300"
        >
          {motivo === "plano" ? t("noAccess.backToDashboard") : t("noAccess.backToLogin")}
        </Link>
      </div>
    </main>
  );
}
