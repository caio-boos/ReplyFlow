import type { Messages } from "../en";

const settings: Messages["settings"] = {
  panel: {
    title: "Configurações",
    subtitle: "Gerencie sua conta e preferências",
    close: "Fechar configurações",
    emailAccounts: "Contas de E-mail",
  },
  appearance: {
    title: "Aparência",
    description: "Escolha o tema da interface",
    dark: {
      title: "Modo escuro",
      description: "Interface com fundo escuro",
    },
    light: {
      title: "Modo claro",
      description: "Interface com fundo claro",
    },
  },
  stores: {
    title: "Lojas conectadas",
    description: "Gerencie suas integrações com a Shopify",
    newAccount: "Nova conta",
    emptyTitle: "Nenhuma loja conectada",
    emptyDescription: "Conecte sua loja Shopify para começar a usar o ReplyFlow",
    connectShopify: "Conectar loja Shopify",
    connectNew: "Conectar nova loja",
    connectNewDescription: "Adicione mais uma loja Shopify ao ReplyFlow",
  },
  aiContext: {
    title: "Contexto de IA",
    description: "Configure o tom de voz e o comportamento das respostas automáticas",
    linkTitle: "Prompt e tom de voz",
    linkDescription: "Personalize como a IA responde seus clientes",
  },
  cartRecovery: {
    title: "Recuperação de carrinho",
    description: "Campanhas automáticas para carrinhos abandonados",
    linkTitle: "Campanhas de remarketing",
    linkDescription: "Acompanhe e configure a recuperação de carrinhos abandonados",
  },
  notifications: {
    title: "Notificações",
    description: "Avisos quando um cliente que você está acompanhando responde",
    emailTitle: "E-mail de notificação",
    emailDescription:
      "Você recebe um aviso quando chega resposta de um cliente com anotação aberta ou de um e-mail enviado pelo Compor E-mail.",
    sendingTo: "Enviando para: <email>{email}</email>",
    status: {
      active: "Ativo",
      notConfigured: "Não configurado",
    },
    placeholder: "seu@email.com",
    placeholderReplace: "Substituir e-mail…",
    disable: "Desativar",
    saved: "E-mail de notificação salvo com sucesso.",
    footer:
      "A notificação é enviada pela própria conta de e-mail da loja que recebeu a resposta, com um link direto para a conversa.",
    errors: {
      saveFailed: "Erro ao salvar",
      invalidEmail: "Informe um e-mail válido.",
    },
  },
  integrations: {
    title: "Integrações de IA",
    description: "Chaves usadas pelas ferramentas de vídeo",
    replicateDescription: "Remoção de marca d'água com IA · ~US$ 0,03 por vídeo",
    billedAccount: "Conta cobrada: <user>{username}</user>",
    status: {
      connected: "Conectado",
      fromEnv: "Via variável de ambiente",
      notConfigured: "Não configurado",
    },
    placeholderReplace: "Substituir token…",
    help: "Gere em <link>replicate.com/account/api-tokens</link>. O token é validado e guardado criptografado — nunca é exibido de volta.",
    toast: {
      connected: "Token conectado ({username}).",
      removed: "Token removido.",
    },
    errors: {
      saveFailed: "Falha ao salvar.",
      tokenRequired: "Informe o token.",
      invalidToken: "Token inválido.",
    },
  },
  context: {
    title: "Contexto da IA",
    description:
      "Cada conta de e-mail possui seu próprio contexto. A IA usará o contexto da conta que recebeu a mensagem para gerar a resposta.",
    account: "Conta:",
    tip: "<strong>Dica para reduzir chargebacks:</strong> Mencione seu prazo de entrega, política de reembolso e canais alternativos de contato. A IA usará essas informações para oferecer soluções antes que o cliente acione o banco.",
    characters: "{count, plural, =0 {# caracteres} one {# caractere} other {# caracteres}}",
    placeholder:
      "Descreva sua loja, produtos, política de trocas, prazo de entrega, como responder reclamações de chargeback...",
    saved: "Salvo com sucesso",
    save: "Salvar contexto",
    errors: {
      accountRequired: "Selecione uma conta.",
      textRequired: "O contexto não pode ficar vazio.",
      accountNotFound: "Conta não encontrada.",
    },
  },
  admin: {
    noStores: "Nenhuma loja encontrada.",
    linked:
      "{count, plural, one {# e-mail vinculado} other {# e-mails vinculados}} às conversas dos clientes.",
    nothingToLink: "Nenhum e-mail pendente de vínculo.",
    noUnownedAccounts: "Nenhuma conta sem dono encontrada.",
    invalidAction: "Ação inválida.",
  },
};

export default settings;
