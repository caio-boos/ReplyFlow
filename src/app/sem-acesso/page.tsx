import Link from "next/link";

export default function SemAcessoPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-gray-900 p-8 text-center">
        <h1 className="text-base font-semibold text-white">
          Nenhuma área liberada
        </h1>
        <p className="mt-2 text-sm text-gray-400">
          Seu acesso ainda não tem permissões atribuídas. Peça ao responsável
          pela conta para liberar as áreas que você precisa.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-indigo-400 hover:text-indigo-300"
        >
          Voltar ao login
        </Link>
      </div>
    </main>
  );
}
