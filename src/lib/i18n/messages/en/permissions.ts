const permissions = {
  dashboard: { label: "Dashboard", description: "Overview and key metrics" },
  conversas: { label: "Conversations", description: "Read and reply to customer emails" },
  tasks: { label: "Tasks", description: "Task queue generated from conversations" },
  annotations: { label: "Notes", description: "Follow-up notes linked to conversations and tasks" },
  customers: { label: "Customers", description: "Customer base and order history" },
  remarketing: { label: "Remarketing", description: "Remarketing campaigns and templates" },
  stats: { label: "Reports", description: "Support statistics and reports" },
  templates: { label: "Templates", description: "Reply template library" },
  advertorials: { label: "Advertorials", description: "Create and publish advertorials" },
  emails: { label: "Compose Email", description: "Send one-off emails and bulk campaigns" },
  watermark: { label: "Remove Watermark", description: "Video watermark removal tool" },
  video_clone: { label: "AI Video Clone", description: "AI video cloning tool" },
  groups: { main: "Main", tools: "Tools" },
};

export default permissions;
