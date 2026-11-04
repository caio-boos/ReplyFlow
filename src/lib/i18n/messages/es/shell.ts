import type { Messages } from "../en";

const shell: Messages["shell"] = {
  nav: {
    sections: {
      tools: "Herramientas",
      team: "Equipo",
    },
    items: {
      dashboard: "Dashboard",
      conversations: "Conversaciones",
      tasks: "Tareas",
      notes: "Notas",
      customers: "Clientes",
      remarketing: "Remarketing",
      templates: "Plantillas",
      advertorials: "Advertoriales",
      composeEmail: "Redactar correo",
      watermark: "Quitar marca de agua",
      videoClone: "Clonar video con IA",
      members: "Miembros",
    },
    locked: {
      title: "Disponible en el plan {plan}",
      titleFallback: "Disponible en un plan superior",
      badgeFallback: "Mejorar",
    },
    profile: "Perfil",
    settings: "Configuración",
  },
  mobile: {
    openMenu: "Abrir menú",
    closeMenu: "Cerrar menú",
  },
  stores: {
    all: "Todas las tiendas",
    count: "{count, plural, =0 {Ninguna tienda} one {# tienda} other {# tiendas}}",
  },
  pagination: {
    label: "Paginación",
    previous: "Página anterior",
    next: "Página siguiente",
    page: "Página {page}",
  },
  billing: {
    retryLater: "Inténtalo de nuevo en unos instantes.",
    subscriptionRequired: "Elige un plan para continuar.",
    planUpgradeRequired: "Esta función no está incluida en tu plan.",
    readonlyOwner:
      "Tu cuenta está en modo de solo lectura. Regulariza tu suscripción para volver a editar.",
    readonlyMember:
      "La suscripción de esta cuenta está inactiva. Avísale al responsable de la cuenta.",
  },
};

export default shell;
