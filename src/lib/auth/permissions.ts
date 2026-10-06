/**
 * Catálogo de permissões concedidas a membros de equipe.
 * O dono (owner) do workspace sempre tem acesso total.
 */

export const PERMISSIONS = [
  "dashboard",
  "conversas",
  "tasks",
  "customers",
  "remarketing",
  "stats",
  "templates",
  "advertorials",
  "emails",
  "watermark",
  "video_clone",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Marcador usado por rotas que apenas o dono do workspace pode acessar. */
export const OWNER_ONLY = "owner" as const;

export type AccessRequirement = Permission | typeof OWNER_ONLY;

export const ALL_PERMISSIONS: Permission[] = [...PERMISSIONS];

const PERMISSION_SET = new Set<string>(PERMISSIONS);

export function isPermission(value: unknown): value is Permission {
  return typeof value === "string" && PERMISSION_SET.has(value);
}

export function sanitizePermissions(value: unknown): Permission[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isPermission))];
}

export interface PermissionMeta {
  label: string;
  description: string;
  /** Rota principal associada — usada para escolher a página inicial do membro. */
  path: string;
}

export const PERMISSION_META: Record<Permission, PermissionMeta> = {
  dashboard: {
    label: "Dashboard",
    description: "Visão geral e métricas resumidas",
    path: "/dashboard",
  },
  conversas: {
    label: "Conversas",
    description: "Ler e responder e-mails de clientes",
    path: "/conversas",
  },
  tasks: {
    label: "Tarefas",
    description: "Fila de tarefas geradas pelas conversas",
    path: "/tasks",
  },
  customers: {
    label: "Clientes",
    description: "Base de clientes e histórico de pedidos",
    path: "/customers",
  },
  remarketing: {
    label: "Remarketing",
    description: "Campanhas e templates de remarketing",
    path: "/remarketing",
  },
  stats: {
    label: "Relatórios",
    description: "Estatísticas e relatórios de atendimento",
    path: "/stats",
  },
  templates: {
    label: "Templates",
    description: "Biblioteca de templates de resposta",
    path: "/templates",
  },
  advertorials: {
    label: "Advertoriais",
    description: "Criação e publicação de advertoriais",
    path: "/advertorials",
  },
  emails: {
    label: "Compor E-mail",
    description: "Envio de e-mails avulsos e campanhas em massa",
    path: "/emails/new",
  },
  watermark: {
    label: "Remover Marca d'Água",
    description: "Ferramenta de remoção de marca d'água em vídeos",
    path: "/ferramentas/marca-dagua",
  },
  video_clone: {
    label: "Clonar Vídeo com IA",
    description: "Ferramenta de clonagem de vídeo com IA",
    path: "/ferramentas/clonar-video",
  },
};

export const PERMISSION_GROUPS: { label: string; keys: Permission[] }[] = [
  {
    label: "Principal",
    keys: [
      "dashboard",
      "conversas",
      "tasks",
      "customers",
      "remarketing",
      "stats",
    ],
  },
  {
    label: "Ferramentas",
    keys: [
      "templates",
      "advertorials",
      "emails",
      "watermark",
      "video_clone",
    ],
  },
];

interface Rule {
  prefix: string;
  requires: AccessRequirement;
}

/** Regras de páginas — avaliadas na ordem (prefixos mais específicos primeiro). */
const PAGE_RULES: Rule[] = [
  { prefix: "/membros", requires: OWNER_ONLY },
  { prefix: "/accounts", requires: OWNER_ONLY },
  { prefix: "/context", requires: OWNER_ONLY },
  { prefix: "/dashboard", requires: "dashboard" },
  { prefix: "/conversas", requires: "conversas" },
  { prefix: "/tasks", requires: "tasks" },
  { prefix: "/customers", requires: "customers" },
  { prefix: "/remarketing", requires: "remarketing" },
  { prefix: "/stats", requires: "stats" },
  { prefix: "/templates", requires: "templates" },
  { prefix: "/advertorials", requires: "advertorials" },
  { prefix: "/products", requires: "advertorials" },
  { prefix: "/emails/new", requires: "emails" },
  { prefix: "/emails", requires: "conversas" },
  { prefix: "/ferramentas/marca-dagua", requires: "watermark" },
  { prefix: "/ferramentas/clonar-video", requires: "video_clone" },
];

/** Regras de API — avaliadas na ordem (prefixos mais específicos primeiro). */
const API_RULES: Rule[] = [
  { prefix: "/api/team", requires: OWNER_ONLY },
  { prefix: "/api/admin", requires: OWNER_ONLY },
  { prefix: "/api/settings", requires: OWNER_ONLY },
  { prefix: "/api/context", requires: OWNER_ONLY },
  { prefix: "/api/dashboard", requires: "dashboard" },
  { prefix: "/api/stats", requires: "stats" },
  { prefix: "/api/tasks", requires: "tasks" },
  { prefix: "/api/customers", requires: "customers" },
  { prefix: "/api/remarketing", requires: "remarketing" },
  { prefix: "/api/bulk-campaigns", requires: "emails" },
  { prefix: "/api/emails/compose", requires: "emails" },
  { prefix: "/api/emails/enhance-draft", requires: "emails" },
  { prefix: "/api/emails", requires: "conversas" },
  { prefix: "/api/templates", requires: "templates" },
  { prefix: "/api/template-library", requires: "templates" },
  { prefix: "/api/advertorials", requires: "advertorials" },
  { prefix: "/api/products", requires: "advertorials" },
  { prefix: "/api/video/clone", requires: "video_clone" },
  { prefix: "/api/video/watermark", requires: "watermark" },
];

function matchRule(rules: Rule[], pathname: string): AccessRequirement | null {
  for (const rule of rules) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule.requires;
    }
  }
  return null;
}

/**
 * Permissão exigida para um caminho. `null` significa que qualquer usuário
 * autenticado do workspace pode acessar (os dados já são filtrados por loja).
 */
export function requiredAccessFor(pathname: string): AccessRequirement | null {
  if (pathname.startsWith("/api/")) return matchRule(API_RULES, pathname);
  return matchRule(PAGE_RULES, pathname);
}

export function hasAccess(
  requirement: AccessRequirement | null,
  isOwner: boolean,
  permissions: Permission[],
): boolean {
  if (requirement === null) return true;
  if (isOwner) return true;
  if (requirement === OWNER_ONLY) return false;
  return permissions.includes(requirement);
}

/** Primeira rota que o membro pode abrir — usada em redirecionamentos. */
export function landingPathFor(permissions: Permission[]): string {
  for (const key of PERMISSIONS) {
    if (permissions.includes(key)) return PERMISSION_META[key].path;
  }
  return "/sem-acesso";
}
