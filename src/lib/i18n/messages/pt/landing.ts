import type { Messages } from "../en";

const landing: Messages["landing"] = {
  meta: {
    title: "ReplyFlow",
    description: "Respostas automáticas de e-mail com IA para e-commerce",
  },
  nav: {
    features: "Recursos",
    howItWorks: "Como funciona",
    pricing: "Preços",
    login: "Entrar",
    getStarted: "Comece grátis",
    toggleMenu: "Abrir menu",
  },
  hero: {
    badge: "Evita chargebacks. Recupera carrinhos. Responde em 90s.",
    titleLine1: "Uma reclamação ignorada.",
    titleLine2: "Um gateway suspenso.",
    subtitle:
      "O Shopify Payments corta sua conta com 1% de chargebacks. A Stripe também. O PayPal também. O ReplyFlow responde a cada pedido de reembolso, reclamação de entrega e ameaça de disputa em menos de 90 segundos. Antes que vire um chargeback aberto. E ainda recupera carrinhos abandonados para você parar de deixar dinheiro na mesa.",
    ctaPrimary: "Proteger minha conta",
    ctaSecondary: "Veja como funciona",
    socialProof: "Usado por lojas que não podem se dar ao luxo de perder o gateway de pagamento",
  },
  flow: {
    inbox: "Caixa de entrada · suporte@loja.com",
    minutesAgo: "há {count} min",
    emails: {
      whereIsOrder: "Cadê meu pedido?",
      damaged: "O produto chegou danificado",
      newOrder: "Novo pedido #4821",
      refund: "Quero um reembolso",
    },
    replySent: "Resposta automática enviada · {time}",
    reply: {
      greeting:
        "Olá, Jessica, obrigado por entrar em contato. Verifiquei seu pedido #4729 e ele está em trânsito com o código de rastreio <code>BR4829201</code>...",
      eta: "A previsão de entrega é <date>quarta-feira, 7 de ago.</date>. Se não receber até lá, enviamos outro na mesma hora.",
      signoff: "Atenciosamente,",
      team: "Equipe da Loja",
    },
    outcome: "Risco de chargeback tratado · Tarefa criada",
  },
  stats: {
    chargebacks: "dos chargebacks evitados antes de serem abertos no banco",
    automated: "dos e-mails de suporte resolvidos sem nenhuma intervenção humana",
    replyTime: "tempo médio entre a reclamação recebida e a resposta enviada",
    roi: "ROI médio das lojas que usam prevenção de chargeback e recuperação de carrinho",
  },
  features: {
    eyebrow: "Recursos",
    title: "Evita chargebacks. Recupera carrinhos. Mantém seu gateway ativo.",
    items: {
      aiReplies: {
        title: "Respostas com IA que parecem escritas por você",
        description:
          "O GPT-4o lê todas as mensagens anteriores e os detalhes do pedido antes de responder. O cliente nem percebe que é automático. Você vai se surpreender com quantos agradecem.",
      },
      gateway: {
        title: "Proteção do gateway de pagamento",
        description:
          "Shopify Payments, Stripe e PayPal desligam sua conta acima de 1% de chargebacks. A IA acalma cada ameaça antes que vire uma disputa aberta. Sua taxa continua limpa.",
      },
      shopify: {
        title: "Integração nativa com Shopify",
        description:
          "Conexão OAuth em um clique traz dados do pedido em tempo real, códigos de rastreio e detalhes do produto para cada resposta. Sem copiar e colar. Sem trocar de aba.",
      },
      escalation: {
        title: "Escalonamento inteligente",
        description:
          "Quando um caso precisa de uma pessoa, uma tarefa é criada automaticamente. Reembolsos aceitos, ameaças jurídicas, mudanças de endereço. Você só vê o que realmente precisa de você.",
      },
      anyProvider: {
        title: "Funciona com qualquer provedor de e-mail",
        description:
          "IMAP/SMTP padrão. Gmail, Outlook, Zoho, Hostinger, Titan. Se sua loja já usa, o ReplyFlow consegue monitorar.",
      },
      cartRecovery: {
        title: "Recuperação de carrinho abandonado",
        description:
          "Checkout abandonado? O ReplyFlow envia um e-mail personalizado citando o carrinho real do cliente. Nada de disparo genérico. Uma mensagem de verdade.",
      },
    },
  },
  howItWorks: {
    eyebrow: "Como funciona",
    title: "Configure em 10 minutos. Proteja sua conta hoje.",
    steps: {
      connect: {
        title: "Conecte seu e-mail e a Shopify",
        description:
          "Adicione suas credenciais IMAP/SMTP e conecte a Shopify em um clique. Sem código, sem webhooks, sem esperar aprovação.",
        detail: "Gmail, Outlook, Zoho, Hostinger, Titan. Qualquer provedor IMAP.",
      },
      intercept: {
        title: "A IA intercepta reclamações antes que escalem",
        description:
          "Toda ameaça de reembolso, reclamação de entrega e e-mail irritado recebe uma resposta contextual em menos de 90 segundos. Antes que o cliente abra uma disputa no banco.",
        detail: "Caixa de entrada verificada a cada 2 minutos. As respostas saem do seu próprio endereço.",
      },
      carts: {
        title: "Carrinhos abandonados voltam",
        description:
          "O ReplyFlow também faz o acompanhamento de checkouts abandonados com uma mensagem personalizada citando o carrinho real do cliente. Nada de disparo em massa. Um e-mail de verdade.",
        detail: "Tarefas criadas só quando um caso realmente precisa de uma pessoa.",
      },
    },
  },
  testimonials: {
    eyebrow: "O que nossos clientes dizem",
    title: "Gateway salvo. Receita recuperada.",
    items: {
      mateus: {
        quote:
          "Meu Shopify Payments já foi suspenso uma vez. Há dois anos. Mudei para o ReplyFlow e caí de 2,3% para 0,4% de chargebacks em seis semanas. Nunca mais tive problema com gateway.",
        role: "Dono de loja de dropshipping, 800+ pedidos/mês",
      },
      larissa: {
        quote:
          "Só a recuperação de carrinho já paga o plano. US$ 4.200 em pedidos recuperados nos primeiros 30 dias. Quase desliguei esse recurso sem querer.",
        role: "Gerente de e-commerce, marca de moda",
      },
      david: {
        quote:
          "Levou 10 minutos para conectar. Já sabia o número do pedido, o status da entrega e o histórico do cliente. As respostas parecem escritas por mim. Os clientes nem desconfiam.",
        role: "Fundador, loja de eletrônicos",
      },
    },
  },
  pricing: {
    eyebrow: "Preços",
    title: "Preço fixo. Sem surpresas.",
    subtitle: "{days} dias de teste gratuito em todos os planos. Nada é cobrado hoje — cancele quando quiser.",
    mostPopular: "Mais popular",
    perMonth: "/mês",
    yearly: "ou {price}/mês no plano anual (economize {percent}%)",
    cta: "Começar teste gratuito de {days} dias",
    plans: {
      starter: {
        description: "Para lojas que precisam acabar com os chargebacks sem contratar suporte.",
      },
      growth: {
        description: "Para marcas em crescimento com alto volume de atendimento.",
      },
      scale: {
        description: "Para operações multi-loja que não podem parar.",
      },
    },
    features: {
      stores: "{count, plural, one {# loja} other {# lojas}}",
      unlimitedStores: "Lojas ilimitadas",
      aiReplies: "{count} respostas com IA/mês",
      shopify: "Integração com Shopify",
      taskQueue: "Fila de tarefas + alertas de chargeback",
      emailSupport: "Suporte por e-mail",
      cartRecovery: "Recuperação de carrinho abandonado",
      analytics: "Métricas de atendimento",
      advertorials: "Advertoriais",
      prioritySupport: "Suporte prioritário",
      everythingInGrowth: "Tudo do Growth",
      videoTools: "Ferramentas de vídeo com IA",
      unlimitedMembers: "Membros de equipe ilimitados",
      onboarding: "Onboarding dedicado",
    },
  },
  cta: {
    badge: "{days} dias de teste gratuito. Cancele quando quiser.",
    titleLine1: "Seu gateway não pode",
    titleLine2: "depender da sorte.",
    body: "Cada reclamação sem resposta é um possível chargeback. Cada chargeback acima de 1% coloca em risco sua conta no Shopify Payments, na Stripe ou no PayPal. O ReplyFlow cuida disso automaticamente e ainda recupera carrinhos abandonados.",
    primary: "Proteger minha conta",
    login: "Já tenho uma conta →",
  },
  footer: {
    rights: "© {year} ReplyFlow. Todos os direitos reservados.",
  },
};

export default landing;
