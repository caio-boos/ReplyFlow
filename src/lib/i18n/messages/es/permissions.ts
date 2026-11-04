import type { Messages } from "../en";

const permissions: Messages["permissions"] = {
  dashboard: { label: "Panel", description: "Resumen y métricas principales" },
  conversas: { label: "Conversaciones", description: "Leer y responder correos de clientes" },
  tasks: { label: "Tareas", description: "Cola de tareas generadas por las conversaciones" },
  annotations: { label: "Notas", description: "Notas de seguimiento vinculadas a conversaciones y tareas" },
  customers: { label: "Clientes", description: "Base de clientes e historial de pedidos" },
  remarketing: { label: "Remarketing", description: "Campañas y plantillas de remarketing" },
  stats: { label: "Informes", description: "Estadísticas e informes de atención" },
  templates: { label: "Plantillas", description: "Biblioteca de plantillas de respuesta" },
  advertorials: { label: "Advertoriales", description: "Creación y publicación de advertoriales" },
  emails: { label: "Redactar correo", description: "Envío de correos individuales y campañas masivas" },
  watermark: { label: "Quitar marca de agua", description: "Herramienta para quitar marcas de agua de videos" },
  video_clone: { label: "Clonar video con IA", description: "Herramienta de clonación de video con IA" },
  groups: { main: "Principal", tools: "Herramientas" },
};

export default permissions;
