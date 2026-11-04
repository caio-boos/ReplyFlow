import type { Messages } from "../en";

const settings: Messages["settings"] = {
  panel: {
    title: "Configuración",
    subtitle: "Administra tu cuenta y tus preferencias",
    close: "Cerrar configuración",
    emailAccounts: "Cuentas de correo",
  },
  appearance: {
    title: "Apariencia",
    description: "Elige el tema de la interfaz",
    dark: {
      title: "Modo oscuro",
      description: "Interfaz con fondo oscuro",
    },
    light: {
      title: "Modo claro",
      description: "Interfaz con fondo claro",
    },
  },
  stores: {
    title: "Tiendas conectadas",
    description: "Administra tus integraciones con Shopify",
    newAccount: "Nueva cuenta",
    emptyTitle: "No hay tiendas conectadas",
    emptyDescription: "Conecta tu tienda Shopify para empezar a usar ReplyFlow",
    connectShopify: "Conectar tienda Shopify",
    connectNew: "Conectar nueva tienda",
    connectNewDescription: "Agrega otra tienda Shopify a ReplyFlow",
  },
  aiContext: {
    title: "Contexto de IA",
    description: "Configura el tono de voz y el comportamiento de las respuestas automáticas",
    linkTitle: "Prompt y tono de voz",
    linkDescription: "Personaliza cómo la IA responde a tus clientes",
  },
  cartRecovery: {
    title: "Recuperación de carritos",
    description: "Campañas automáticas para carritos abandonados",
    linkTitle: "Campañas de remarketing",
    linkDescription: "Supervisa y configura la recuperación de carritos abandonados",
  },
  notifications: {
    title: "Notificaciones",
    description: "Avisos cuando responde un cliente al que le estás dando seguimiento",
    emailTitle: "Correo de notificación",
    emailDescription:
      "Recibirás un aviso cuando llegue una respuesta de un cliente con una nota abierta o de un correo enviado con Redactar correo.",
    sendingTo: "Enviando a: <email>{email}</email>",
    status: {
      active: "Activo",
      notConfigured: "Sin configurar",
    },
    placeholder: "tu@correo.com",
    placeholderReplace: "Reemplazar correo…",
    disable: "Desactivar",
    saved: "Correo de notificación guardado correctamente.",
    footer:
      "La notificación se envía desde la propia cuenta de correo de la tienda que recibió la respuesta, con un enlace directo a la conversación.",
    errors: {
      saveFailed: "Error al guardar",
      invalidEmail: "Ingresa un correo electrónico válido.",
    },
  },
  integrations: {
    title: "Integraciones de IA",
    description: "Claves utilizadas por las herramientas de video",
    replicateDescription: "Eliminación de marcas de agua con IA · ~US$ 0.03 por video",
    billedAccount: "Cuenta facturada: <user>{username}</user>",
    status: {
      connected: "Conectado",
      fromEnv: "Mediante variable de entorno",
      notConfigured: "Sin configurar",
    },
    placeholderReplace: "Reemplazar token…",
    help: "Genéralo en <link>replicate.com/account/api-tokens</link>. El token se valida y se guarda cifrado; nunca se vuelve a mostrar.",
    toast: {
      connected: "Token conectado ({username}).",
      removed: "Token eliminado.",
    },
    errors: {
      saveFailed: "No se pudo guardar.",
      tokenRequired: "Ingresa el token.",
      invalidToken: "Token no válido.",
    },
  },
  context: {
    title: "Contexto de la IA",
    description:
      "Cada cuenta de correo tiene su propio contexto. La IA usará el contexto de la cuenta que recibió el mensaje para generar la respuesta.",
    account: "Cuenta:",
    tip: "<strong>Consejo para reducir chargebacks:</strong> Menciona tus plazos de entrega, tu política de reembolso y canales de contacto alternativos. La IA usará esta información para ofrecer soluciones antes de que el cliente acuda a su banco.",
    characters: "{count, plural, one {# carácter} other {# caracteres}}",
    placeholder:
      "Describe tu tienda, productos, política de cambios, plazos de entrega, cómo responder a reclamos de chargeback...",
    saved: "Guardado correctamente",
    save: "Guardar contexto",
    errors: {
      accountRequired: "Selecciona una cuenta.",
      textRequired: "El contexto no puede estar vacío.",
      accountNotFound: "Cuenta no encontrada.",
    },
  },
  admin: {
    noStores: "No se encontraron tiendas.",
    linked:
      "{count, plural, one {# correo vinculado} other {# correos vinculados}} a las conversaciones de los clientes.",
    nothingToLink: "No hay correos pendientes de vincular.",
    noUnownedAccounts: "No se encontraron cuentas sin propietario.",
    invalidAction: "Acción no válida.",
  },
};

export default settings;
