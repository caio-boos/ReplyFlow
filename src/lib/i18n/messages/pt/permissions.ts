import type { Messages } from "../en";

const permissions: Messages["permissions"] = {
  dashboard: { label: "Dashboard", description: "Visão geral e métricas resumidas" },
  conversas: { label: "Conversas", description: "Ler e responder e-mails de clientes" },
  tasks: { label: "Tarefas", description: "Fila de tarefas geradas pelas conversas" },
  annotations: { label: "Anotações", description: "Anotações de acompanhamento vinculadas a conversas e tarefas" },
  customers: { label: "Clientes", description: "Base de clientes e histórico de pedidos" },
  remarketing: { label: "Remarketing", description: "Campanhas e templates de remarketing" },
  stats: { label: "Relatórios", description: "Estatísticas e relatórios de atendimento" },
  templates: { label: "Templates", description: "Biblioteca de templates de resposta" },
  advertorials: { label: "Advertoriais", description: "Criação e publicação de advertoriais" },
  emails: { label: "Compor E-mail", description: "Envio de e-mails avulsos e campanhas em massa" },
  watermark: { label: "Remover Marca d'Água", description: "Ferramenta de remoção de marca d'água em vídeos" },
  video_clone: { label: "Clonar Vídeo com IA", description: "Ferramenta de clonagem de vídeo com IA" },
  groups: { main: "Principal", tools: "Ferramentas" },
};

export default permissions;
