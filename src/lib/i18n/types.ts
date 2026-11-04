/** Tipos e listas de namespaces — seguro para o cliente (sem os dicionários). */
import type { Messages } from "./messages/en";

export type { Messages };
export type Namespace = keyof Messages;

/** Enviados a todas as páginas (landing, login, cadastro, planos, convite). */
export const PUBLIC_NAMESPACES = [
  "common",
  "landing",
  "auth",
  "billing",
  "permissions",
] as const satisfies readonly Namespace[];

/** Enviados apenas dentro do painel (layout do dashboard). */
export const APP_NAMESPACES = [
  "shell",
  "team",
  "stores",
  "settings",
  "inbox",
  "workspace",
  "compose",
  "marketing",
  "tools",
] as const satisfies readonly Namespace[];
