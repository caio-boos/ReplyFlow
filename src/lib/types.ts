export type EmailStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "cancelled";

export interface EmailAttachment {
  filename: string;
  contentType: string;
  url: string;
}

export interface EmailDoc {
  id: string;
  accountId: string;
  accountEmail: string;
  customerId: string;
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  from: string;
  fromName: string;
  to: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  receivedAt: { seconds: number; nanoseconds: number };
  scheduledReplyAt: { seconds: number; nanoseconds: number };
  status: EmailStatus;
  aiResponse: string | null;
  sentAt: { seconds: number; nanoseconds: number } | null;
  error: string | null;
  attachments?: EmailAttachment[];
  chargebackRisk?: boolean;
  orderValue?: number | null;
}

export interface AccountDoc {
  id: string;
  label: string;
  provider: "godaddy" | "hostinger" | "other";
  email: string;
  imapHost: string;
  imapPort: number;
  smtpHost: string;
  smtpPort: number;
  encryptedPassword: string;
  lastUid: number;
  active: boolean;
  shopifyDomain?: string | null;
  shopifyClientId?: string | null;
  shopifyConnected?: boolean;
  trackingUrlTemplate?: string | null;
  systemPrompt?: string | null;
  logoUrl?: string | null;
  replyLanguage?: string;
  createdAt: { seconds: number; nanoseconds: number };
}

export interface CustomerDoc {
  id: string;
  name: string;
  emails: string[];
  orderNumbers: string[];
  linkedEmailIds: string[];
  suggestedLinks: Array<{
    incomingEmail: string;
    incomingEmailDocId: string;
    reason: string;
  }>;
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}

export type TaskPriority = "high" | "medium" | "low";

export interface TaskDoc {
  id: string;
  emailId: string;
  customerId: string;
  accountId: string;
  accountEmail: string;
  customerName: string;
  emailSubject: string;
  description: string;
  priority: TaskPriority;
  completed: boolean;
  note?: string;
  flags: {
    chargeback_risk?: boolean;
    manual_review?: boolean;
    refund_pending?: boolean;
    photos_received?: boolean;
    carrier_problem?: boolean;
    address_problem?: boolean;
  };
  createdAt: { seconds: number; nanoseconds: number };
}
