import type { Messages } from "../en";

const auth: Messages["auth"] = {
  meta: {
    login: "Entrar — ReplyFlow",
    register: "Criar conta — ReplyFlow",
  },
  shared: {
    rights: "© {year} ReplyFlow. Todos os direitos reservados.",
    emailLabel: "E-mail",
    emailPlaceholder: "admin@minhaloja.com",
    passwordLabel: "Senha",
    confirmPasswordLabel: "Confirmar senha",
    showPassword: "Mostrar senha",
    hidePassword: "Ocultar senha",
  },
  login: {
    title: "Bem-vindo de volta",
    subtitle: "Acesse seu painel de controle",
    submit: "Entrar",
    submitting: "Entrando...",
    noAccount: "Não tem conta?",
    createAccount: "Criar conta grátis",
    errors: {
      emailNotVerified: "E-mail não verificado. Verifique sua caixa de entrada.",
      invalidCredentials: "E-mail ou senha incorretos",
      tooManyRequests: "Muitas tentativas. Aguarde alguns minutos.",
      generic: "Erro ao fazer login",
    },
    panel: {
      badge: "Proteção ativa",
      titleLine1: "Seu gateway.",
      titleLine2: "Protegido 24/7.",
      body: "O ReplyFlow trata cada reclamação antes que ela vire um chargeback. Uma ferramenta. Nenhum e-mail perdido. Nenhuma suspensão de gateway.",
      stats: {
        chargebacks: "chargebacks evitados",
        replyTime: "tempo médio de resposta",
        roi: "ROI médio",
      },
      testimonial: {
        quote:
          "Meu Shopify Payments já foi suspenso uma vez. Com o ReplyFlow, caí de 2,3% para 0,4% de chargebacks em seis semanas. Nunca mais tive problema com gateway.",
        role: "Dropshipping · 800+ pedidos/mês",
      },
    },
  },
  register: {
    title: "Criar conta",
    subtitle: "{days} dias de teste gratuito · Cancele quando quiser",
    passwordPlaceholder: "Mínimo 8 caracteres",
    confirmPlaceholder: "Repita a senha",
    submit: "Criar conta grátis",
    submitting: "Criando conta...",
    hasAccount: "Já tem conta?",
    login: "Entrar",
    errors: {
      passwordTooShort: "A senha deve ter no mínimo 8 caracteres.",
      passwordMismatch: "As senhas não conferem.",
      emailInUse: "Este e-mail já está cadastrado.",
      invalidEmail: "E-mail inválido.",
      weakPassword: "Senha muito fraca. Use ao menos 8 caracteres.",
      generic: "Erro ao criar conta. Tente novamente.",
    },
    success: {
      title: "Verifique seu e-mail",
      body: "Enviamos um link para <email>{email}</email>. Clique nele para ativar sua conta. Depois é só entrar e escolher seu plano — os primeiros {days} dias são grátis.",
      goToLogin: "Ir para o login",
    },
    panel: {
      badge: "{days} dias de teste gratuito · Cancele quando quiser",
      titleLine1: "Acabe com os chargebacks.",
      titleLine2: "Comece hoje.",
      body: "Conecte seu e-mail em minutos. O ReplyFlow começa a proteger seu gateway na hora — e ainda recupera carrinhos.",
      features: {
        gateway: {
          title: "Proteção do gateway",
          description:
            "Mantém sua taxa de chargeback abaixo de 1% — o limite que leva à suspensão no Shopify Payments, na Stripe e no PayPal.",
        },
        speed: {
          title: "Respostas em menos de 90 segundos",
          description:
            "Cada pedido de reembolso, reclamação de entrega e ameaça de disputa respondido automaticamente antes de escalar.",
        },
        carts: {
          title: "Recuperação de carrinho abandonado",
          description:
            "Acompanhamento personalizado de checkouts abandonados. Nada de disparo em massa — uma mensagem de verdade citando o carrinho real do cliente.",
        },
      },
      socialProof: "Escolhido por lojas que <highlight>não podem correr o risco de suspensão do gateway</highlight>",
    },
  },
  invite: {
    unavailableTitle: "Convite indisponível",
    goToLogin: "Ir para o login",
    title: "Ative seu acesso",
    subtitle: "Crie uma senha para entrar como <strong>{email}</strong>.",
    stores: "Lojas:",
    access: "Acesso:",
    nameLabel: "Seu nome",
    passwordLabel: "Senha",
    confirmPasswordLabel: "Confirmar senha",
    submit: "Criar senha e entrar",
    submitting: "Ativando...",
    errors: {
      invalid: "Convite inválido.",
      passwordTooShort: "A senha precisa ter ao menos 8 caracteres.",
      passwordMismatch: "As senhas não coincidem.",
      activateFailed: "Não foi possível ativar o acesso.",
      existingAccount: "Já existe uma conta com este e-mail. Entre com a sua senha atual.",
      generic: "Não foi possível concluir. Tente novamente.",
    },
  },
  noAccess: {
    subscription: {
      title: "Assinatura da conta inativa",
      body: "A assinatura desta conta precisa ser ativada ou regularizada pelo responsável. Assim que isso acontecer, seu acesso volta automaticamente.",
    },
    plan: {
      title: "Área fora do plano atual",
      body: "Esta área não está incluída no plano da conta. Peça ao responsável para fazer upgrade, se precisar dela.",
    },
    none: {
      title: "Nenhuma área liberada",
      body: "Seu acesso ainda não tem permissões atribuídas. Peça ao responsável pela conta para liberar as áreas que você precisa.",
    },
    backToDashboard: "Voltar ao painel",
    backToLogin: "Voltar ao login",
  },
  api: {
    invalidToken: "Token inválido",
    emailNotVerified: "E-mail não verificado. Verifique sua caixa de entrada e clique no link de confirmação.",
    invalidCredentials: "Credenciais inválidas",
    inviteInvalid: "Convite inválido.",
    inviteUsed: "Convite inválido ou já utilizado.",
    inviteExpired: "Convite expirado.",
    passwordTooShort: "A senha precisa ter ao menos 8 caracteres.",
    emailInOtherTeam: "Este e-mail já faz parte de outra equipe. Use outro endereço de e-mail.",
  },
};

export default auth;
