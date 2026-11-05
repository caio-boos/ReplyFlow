import type { Messages } from "../en";

const auth: Messages["auth"] = {
  meta: {
    login: "Iniciar sesión — ReplyFlow",
    register: "Crear cuenta — ReplyFlow",
  },
  shared: {
    rights: "© {year} ReplyFlow. Todos los derechos reservados.",
    emailLabel: "Correo electrónico",
    emailPlaceholder: "admin@mitienda.com",
    passwordLabel: "Contraseña",
    confirmPasswordLabel: "Confirmar contraseña",
    showPassword: "Mostrar contraseña",
    hidePassword: "Ocultar contraseña",
  },
  login: {
    title: "Bienvenido de nuevo",
    subtitle: "Accede a tu panel de control",
    submit: "Iniciar sesión",
    submitting: "Iniciando sesión…",
    noAccount: "¿No tienes cuenta?",
    createAccount: "Crear cuenta gratis",
    errors: {
      emailNotVerified: "Correo no verificado. Revisa tu bandeja de entrada.",
      invalidCredentials: "Correo o contraseña incorrectos",
      tooManyRequests: "Demasiados intentos. Espera unos minutos.",
      generic: "No se pudo iniciar sesión. Inténtalo de nuevo.",
    },
    panel: {
      badge: "Protección activa",
      titleLine1: "Tu pasarela.",
      titleLine2: "Protegida 24/7.",
      body: "ReplyFlow atiende cada queja antes de que se convierta en un chargeback. Una sola herramienta. Ningún correo sin responder. Ninguna suspensión de la pasarela.",
      stats: {
        chargebacks: "chargebacks frenados",
        replyTime: "tiempo medio de respuesta",
        roi: "ROI medio",
      },
      testimonial: {
        quote:
          "Me suspendieron Shopify Payments una vez. Con ReplyFlow bajé del 2,3% al 0,4% de chargebacks en seis semanas. No he vuelto a tener problemas con la pasarela.",
        role: "Dropshipping · más de 800 pedidos/mes",
      },
    },
  },
  register: {
    title: "Crear cuenta",
    subtitle: "{days} días de prueba gratuita · Cancela cuando quieras",
    passwordPlaceholder: "Mínimo 8 caracteres",
    confirmPlaceholder: "Repite la contraseña",
    submit: "Crear cuenta gratis",
    submitting: "Creando cuenta…",
    hasAccount: "¿Ya tienes cuenta?",
    login: "Iniciar sesión",
    errors: {
      passwordTooShort: "La contraseña debe tener al menos 8 caracteres.",
      passwordMismatch: "Las contraseñas no coinciden.",
      emailInUse: "Este correo ya está registrado.",
      invalidEmail: "Correo electrónico no válido.",
      weakPassword: "Contraseña demasiado débil. Usa al menos 8 caracteres.",
      generic: "No se pudo crear la cuenta. Inténtalo de nuevo.",
    },
    success: {
      title: "Revisa tu correo",
      body: "Enviamos un enlace a <email>{email}</email>. Haz clic en él para activar tu cuenta. Después, inicia sesión y elige tu plan: los primeros {days} días son gratis.",
      goToLogin: "Ir a iniciar sesión",
    },
    panel: {
      badge: "{days} días de prueba gratuita · Cancela cuando quieras",
      titleLine1: "Frena los chargebacks.",
      titleLine2: "Empieza hoy.",
      body: "Conecta tu correo en minutos. ReplyFlow empieza a proteger tu pasarela de inmediato y, de paso, recupera carritos.",
      features: {
        gateway: {
          title: "Protección de la pasarela",
          description:
            "Mantiene tu tasa de chargebacks por debajo del 1%, el límite que provoca suspensiones en Shopify Payments, Stripe y PayPal.",
        },
        speed: {
          title: "Respuestas en menos de 90 segundos",
          description:
            "Cada solicitud de reembolso, queja de envío y amenaza de disputa se responde automáticamente antes de que escale.",
        },
        carts: {
          title: "Recuperación de carritos abandonados",
          description:
            "Seguimiento personalizado de checkouts abandonados. Nada de envíos masivos: un mensaje real que menciona su carrito.",
        },
      },
      socialProof: "Elegido por tiendas que <highlight>no pueden permitirse una suspensión de la pasarela</highlight>",
    },
  },
  invite: {
    unavailableTitle: "Invitación no disponible",
    goToLogin: "Ir a iniciar sesión",
    title: "Activa tu acceso",
    subtitle: "Crea una contraseña para entrar como <strong>{email}</strong>.",
    stores: "Tiendas:",
    access: "Acceso:",
    nameLabel: "Tu nombre",
    passwordLabel: "Contraseña",
    confirmPasswordLabel: "Confirmar contraseña",
    submit: "Crear contraseña y entrar",
    submitting: "Activando…",
    errors: {
      invalid: "Invitación no válida.",
      passwordTooShort: "La contraseña debe tener al menos 8 caracteres.",
      passwordMismatch: "Las contraseñas no coinciden.",
      activateFailed: "No se pudo activar el acceso.",
      existingAccount: "Ya existe una cuenta con este correo. Inicia sesión con tu contraseña actual.",
      generic: "No se pudo completar. Inténtalo de nuevo.",
    },
  },
  noAccess: {
    subscription: {
      title: "Suscripción de la cuenta inactiva",
      body: "El responsable de la cuenta debe activar o regularizar la suscripción. En cuanto lo haga, recuperarás el acceso automáticamente.",
    },
    plan: {
      title: "Área no incluida en el plan actual",
      body: "Esta área no está incluida en el plan de la cuenta. Si la necesitas, pide al responsable que mejore el plan.",
    },
    none: {
      title: "Ninguna área habilitada",
      body: "Tu acceso todavía no tiene permisos asignados. Pide al responsable de la cuenta que habilite las áreas que necesitas.",
    },
    backToDashboard: "Volver al panel",
    backToLogin: "Volver a iniciar sesión",
  },
  api: {
    invalidToken: "Token no válido",
    emailNotVerified: "Correo no verificado. Revisa tu bandeja de entrada y haz clic en el enlace de confirmación.",
    invalidCredentials: "Credenciales no válidas",
    inviteInvalid: "Invitación no válida.",
    inviteUsed: "Invitación no válida o ya utilizada.",
    inviteExpired: "La invitación ha caducado.",
    passwordTooShort: "La contraseña debe tener al menos 8 caracteres.",
    emailInOtherTeam: "Este correo ya pertenece a otro equipo. Usa otra dirección de correo.",
  },
};

export default auth;
