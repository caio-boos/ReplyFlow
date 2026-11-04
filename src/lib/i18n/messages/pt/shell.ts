import type { Messages } from "../en";

const shell: Messages["shell"] = {
  nav: {
    sections: {
      tools: "Ferramentas",
      team: "Equipe",
    },
    items: {
      dashboard: "Dashboard",
      conversations: "Conversas",
      tasks: "Tarefas",
      notes: "Anotações",
      customers: "Clientes",
      remarketing: "Remarketing",
      templates: "Templates",
      advertorials: "Advertoriais",
      composeEmail: "Compor E-mail",
      watermark: "Remover Marca d'Água",
      videoClone: "Clonar Vídeo com IA",
      members: "Membros",
    },
    locked: {
      title: "Disponível no plano {plan}",
      titleFallback: "Disponível no plano superior",
      badgeFallback: "Upgrade",
    },
    profile: "Perfil",
    settings: "Configurações",
  },
  mobile: {
    openMenu: "Abrir menu",
    closeMenu: "Fechar menu",
  },
  stores: {
    all: "Todas as lojas",
    count: "{count, plural, =0 {Nenhuma loja} one {# loja} other {# lojas}}",
  },
  pagination: {
    label: "Paginação",
    previous: "Página anterior",
    next: "Próxima página",
    page: "Página {page}",
  },
  billing: {
    retryLater: "Tente novamente em instantes.",
    subscriptionRequired: "Escolha um plano para continuar.",
    planUpgradeRequired: "Este recurso não está incluído no seu plano.",
    readonlyOwner:
      "Sua conta está em modo somente leitura. Regularize a assinatura para voltar a editar.",
    readonlyMember:
      "A assinatura desta conta está inativa. Avise o responsável pela conta.",
  },
};

export default shell;
