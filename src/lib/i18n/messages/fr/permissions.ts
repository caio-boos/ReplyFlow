import type { Messages } from "../en";

const permissions: Messages["permissions"] = {
  dashboard: { label: "Tableau de bord", description: "Vue d'ensemble et indicateurs clés" },
  conversas: { label: "Conversations", description: "Lire et répondre aux e-mails des clients" },
  tasks: { label: "Tâches", description: "File de tâches générées par les conversations" },
  annotations: { label: "Notes", description: "Notes de suivi liées aux conversations et aux tâches" },
  customers: { label: "Clients", description: "Base clients et historique des commandes" },
  remarketing: { label: "Remarketing", description: "Campagnes et modèles de remarketing" },
  stats: { label: "Rapports", description: "Statistiques et rapports du support" },
  templates: { label: "Modèles", description: "Bibliothèque de modèles de réponse" },
  advertorials: { label: "Publireportages", description: "Création et publication de publireportages" },
  emails: { label: "Rédiger un e-mail", description: "Envoi d'e-mails ponctuels et de campagnes groupées" },
  watermark: { label: "Supprimer le filigrane", description: "Outil de suppression de filigrane sur les vidéos" },
  video_clone: { label: "Cloner une vidéo avec l'IA", description: "Outil de clonage vidéo par IA" },
  groups: { main: "Principal", tools: "Outils" },
};

export default permissions;
