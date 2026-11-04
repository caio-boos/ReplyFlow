import type { Messages } from "../en";

const landing: Messages["landing"] = {
  meta: {
    title: "ReplyFlow",
    description: "Respuestas automáticas de correo con IA para e-commerce",
  },
  nav: {
    features: "Funciones",
    howItWorks: "Cómo funciona",
    pricing: "Precios",
    login: "Iniciar sesión",
    getStarted: "Empieza gratis",
    toggleMenu: "Abrir menú",
  },
  hero: {
    badge: "Frena chargebacks. Recupera carritos. Responde en 90 s.",
    titleLine1: "Una queja ignorada.",
    titleLine2: "Una pasarela suspendida.",
    subtitle:
      "Shopify Payments te bloquea con un 1% de chargebacks. Stripe también. Y PayPal también. ReplyFlow responde cada solicitud de reembolso, queja de envío y amenaza de disputa en menos de 90 segundos. Antes de que se convierta en un chargeback. Además, recupera carritos abandonados para que dejes de perder dinero.",
    ctaPrimary: "Proteger mi cuenta",
    ctaSecondary: "Mira cómo funciona",
    socialProof: "Usado por tiendas que no pueden permitirse perder su pasarela de pago",
  },
  flow: {
    inbox: "Bandeja de entrada · soporte@tienda.com",
    minutesAgo: "hace {count} min",
    emails: {
      whereIsOrder: "¿Dónde está mi pedido?",
      damaged: "El producto llegó dañado",
      newOrder: "Nuevo pedido #4821",
      refund: "Quiero un reembolso",
    },
    replySent: "Respuesta automática enviada · {time}",
    reply: {
      greeting:
        "Hola, Jessica, gracias por escribirnos. He revisado tu pedido #4729 y está en camino con el número de seguimiento <code>BR4829201</code>...",
      eta: "Tu paquete debería llegar el <date>miércoles 7 de agosto</date>. Si no lo recibes para entonces, te enviaremos un reemplazo de inmediato.",
      signoff: "Saludos cordiales,",
      team: "El equipo de la tienda",
    },
    outcome: "Riesgo de chargeback atendido · Tarea creada",
  },
  stats: {
    chargebacks: "de los chargebacks se frenan antes de llegar al banco",
    automated: "de los correos de soporte se resuelven sin intervención humana",
    replyTime: "tiempo medio entre la queja recibida y la respuesta enviada",
    roi: "ROI medio de las tiendas que usan prevención de chargebacks y recuperación de carritos",
  },
  features: {
    eyebrow: "Funciones",
    title: "Frena chargebacks. Recupera carritos. Mantiene tu pasarela activa.",
    items: {
      aiReplies: {
        title: "Respuestas con IA que parecen escritas por ti",
        description:
          "GPT-4o lee cada mensaje anterior y los detalles del pedido antes de responder. Tus clientes no notarán que es automático. Te sorprenderá cuántos dan las gracias.",
      },
      gateway: {
        title: "Protección de la pasarela de pago",
        description:
          "Shopify Payments, Stripe y PayPal cortan el servicio por encima del 1% de chargebacks. La IA desactiva cada amenaza antes de que se convierta en una disputa. Tu tasa se mantiene limpia.",
      },
      shopify: {
        title: "Integración nativa con Shopify",
        description:
          "Con OAuth en un clic, cada respuesta incluye datos del pedido en tiempo real, números de seguimiento y detalles del producto. Sin copiar y pegar. Sin cambiar de pestaña.",
      },
      escalation: {
        title: "Escalado inteligente",
        description:
          "Cuando un caso necesita a una persona, se crea una tarea automáticamente. Reembolsos aceptados, amenazas legales, cambios de dirección. Solo ves lo que de verdad te necesita.",
      },
      anyProvider: {
        title: "Funciona con cualquier proveedor de correo",
        description:
          "IMAP/SMTP estándar. Gmail, Outlook, Zoho, Hostinger, Titan. Si tu tienda ya lo usa, ReplyFlow puede monitorearlo.",
      },
      cartRecovery: {
        title: "Recuperación de carritos abandonados",
        description:
          "¿Checkout abandonado? ReplyFlow envía un correo personalizado que menciona el carrito real del cliente. Nada de envíos masivos genéricos. Un mensaje de verdad.",
      },
    },
  },
  howItWorks: {
    eyebrow: "Cómo funciona",
    title: "Configúralo en 10 minutos. Protege tu cuenta hoy.",
    steps: {
      connect: {
        title: "Conecta tu correo y Shopify",
        description:
          "Agrega tus credenciales IMAP/SMTP y vincula Shopify en un clic. Sin código, sin webhooks, sin esperar aprobaciones.",
        detail: "Gmail, Outlook, Zoho, Hostinger, Titan. Cualquier proveedor IMAP.",
      },
      intercept: {
        title: "La IA intercepta las quejas antes de que escalen",
        description:
          "Cada amenaza de reembolso, queja de envío y correo molesto recibe una respuesta contextual en menos de 90 segundos. Antes de que el cliente abra una disputa con su banco.",
        detail: "Bandeja revisada cada 2 minutos. Las respuestas salen desde tu propia dirección.",
      },
      carts: {
        title: "Los carritos abandonados vuelven",
        description:
          "ReplyFlow también da seguimiento a los checkouts abandonados con un mensaje personalizado que menciona el carrito real del cliente. Nada de envíos masivos. Un correo de verdad.",
        detail: "Solo se crean tareas cuando un caso realmente necesita a una persona.",
      },
    },
  },
  testimonials: {
    eyebrow: "Lo que dicen nuestros clientes",
    title: "Pasarela salvada. Ingresos recuperados.",
    items: {
      mateus: {
        quote:
          "Me suspendieron Shopify Payments una vez. Hace dos años. Me pasé a ReplyFlow y bajé del 2,3% al 0,4% de chargebacks en seis semanas. No he vuelto a tener problemas con la pasarela.",
        role: "Dueño de tienda de dropshipping, más de 800 pedidos/mes",
      },
      larissa: {
        quote:
          "Solo la recuperación de carritos ya paga el plan. 4.200 US$ en pedidos recuperados en los primeros 30 días. Casi desactivo esa función por error.",
        role: "Gerente de e-commerce, marca de moda",
      },
      david: {
        quote:
          "Tardé 10 minutos en conectarlo. Ya conocía el número de pedido, el estado del envío y el historial del cliente. Las respuestas suenan exactamente como yo. Los clientes ni lo sospechan.",
        role: "Fundador, tienda de electrónica",
      },
    },
  },
  pricing: {
    eyebrow: "Precios",
    title: "Precios fijos. Sin sorpresas.",
    subtitle: "{days} días de prueba gratuita en todos los planes. No se cobra nada hoy: cancela cuando quieras.",
    mostPopular: "Más popular",
    perMonth: "/mes",
    yearly: "o {price}/mes con facturación anual (ahorra un {percent}%)",
    cta: "Empezar prueba gratuita de {days} días",
    plans: {
      starter: {
        description: "Para tiendas que necesitan frenar los chargebacks sin contratar soporte.",
      },
      growth: {
        description: "Para marcas en crecimiento con mucho volumen de soporte.",
      },
      scale: {
        description: "Para operaciones con varias tiendas que no pueden permitirse caídas.",
      },
    },
    features: {
      stores: "{count, plural, one {# tienda} other {# tiendas}}",
      unlimitedStores: "Tiendas ilimitadas",
      aiReplies: "{count} respuestas con IA/mes",
      shopify: "Integración con Shopify",
      taskQueue: "Cola de tareas + alertas de chargeback",
      emailSupport: "Soporte por correo",
      cartRecovery: "Recuperación de carritos abandonados",
      analytics: "Métricas de soporte",
      advertorials: "Publirreportajes",
      prioritySupport: "Soporte prioritario",
      everythingInGrowth: "Todo lo de Growth",
      videoTools: "Herramientas de video con IA",
      unlimitedMembers: "Miembros de equipo ilimitados",
      onboarding: "Onboarding dedicado",
    },
  },
  cta: {
    badge: "{days} días de prueba gratuita. Cancela cuando quieras.",
    titleLine1: "Tu pasarela no puede",
    titleLine2: "depender de la suerte.",
    body: "Cada queja sin respuesta es un posible chargeback. Cada chargeback por encima del 1% pone en riesgo tu cuenta de Shopify Payments, Stripe o PayPal. ReplyFlow se encarga automáticamente y, de paso, recupera carritos abandonados.",
    primary: "Proteger mi cuenta",
    login: "Ya tengo una cuenta →",
  },
  footer: {
    rights: "© {year} ReplyFlow. Todos los derechos reservados.",
  },
};

export default landing;
