import { getAdminDb } from "@/lib/firebase/admin";
import { FieldValue, FieldPath } from "firebase-admin/firestore";

// Regex patterns for order numbers commonly used in Brazilian e-commerce
const ORDER_NUMBER_PATTERNS = [
  /#\s*(\d{4,})/gi,
  /pedido\s*[:#]?\s*(\d{4,})/gi,
  /order\s*[:#]?\s*(\d{4,})/gi,
  /n[uú]mero\s+do\s+pedido\s*[:#]?\s*(\d{4,})/gi,
  /compra\s*[:#]?\s*(\d{4,})/gi,
];

export function extractOrderNumbers(text: string): string[] {
  const found = new Set<string>();
  for (const pattern of ORDER_NUMBER_PATTERNS) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      found.add(match[1]);
    }
  }
  return Array.from(found);
}

/** Levenshtein distance (simple iterative implementation, no external lib needed at runtime) */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

export interface CustomerDoc {
  id: string;
  name: string;
  emails: string[];
  orderNumbers: string[];
  linkedEmailIds: string[];
  suggestedLinks: { customerId: string; reason: string }[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface MatchResult {
  customerId: string;
  confidence: "exact" | "order" | "name" | "new";
  isNewCustomer: boolean;
  suggestedLinkCustomerId?: string;
}

export async function matchOrCreateCustomer(params: {
  fromEmail: string;
  fromName: string;
  bodyText: string;
  emailDocId: string;
}): Promise<MatchResult> {
  const db = getAdminDb();
  const customersRef = db.collection("customers");
  const { fromEmail, fromName, bodyText, emailDocId } = params;

  const emailNorm = fromEmail.toLowerCase().trim();
  const nameNorm = normalizeName(fromName);
  const orderNumbers = extractOrderNumbers(bodyText);

  // 1. Exact email match
  const byEmail = await customersRef.where("emails", "array-contains", emailNorm).limit(1).get();
  if (!byEmail.empty) {
    const doc = byEmail.docs[0];
    await doc.ref.update({
      linkedEmailIds: FieldValue.arrayUnion(emailDocId),
      orderNumbers: FieldValue.arrayUnion(...(orderNumbers.length > 0 ? orderNumbers : ["__noop__"])),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (orderNumbers.length > 0) {
      await doc.ref.update({ orderNumbers: FieldValue.arrayUnion(...orderNumbers) });
    }
    return { customerId: doc.id, confidence: "exact", isNewCustomer: false };
  }

  // 2. Order number match
  if (orderNumbers.length > 0) {
    const byOrder = await customersRef
      .where("orderNumbers", "array-contains-any", orderNumbers)
      .limit(1)
      .get();
    if (!byOrder.empty) {
      const doc = byOrder.docs[0];
      await doc.ref.update({
        emails: FieldValue.arrayUnion(emailNorm),
        linkedEmailIds: FieldValue.arrayUnion(emailDocId),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { customerId: doc.id, confidence: "order", isNewCustomer: false };
    }
  }

  // 3. Fuzzy name match (only if name is meaningful)
  let suggestedLinkCustomerId: string | undefined;
  if (nameNorm.length > 3) {
    const allCustomers = await customersRef.limit(200).get();
    for (const doc of allCustomers.docs) {
      const existing = normalizeName((doc.data() as CustomerDoc).name ?? "");
      if (existing.length > 3 && levenshtein(nameNorm, existing) <= 2) {
        suggestedLinkCustomerId = doc.id;
        // Save suggestion but don't auto-link
        await doc.ref.update({
          suggestedLinks: FieldValue.arrayUnion({
            incomingEmail: emailNorm,
            incomingEmailDocId: emailDocId,
            reason: `Name fuzzy match: "${fromName}" ≈ "${(doc.data() as CustomerDoc).name}"`,
          }),
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;
      }
    }
  }

  // 4. Create new customer
  const newCustomer = await customersRef.add({
    name: fromName,
    emails: [emailNorm],
    orderNumbers,
    linkedEmailIds: [emailDocId],
    suggestedLinks: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    customerId: newCustomer.id,
    confidence: "new",
    isNewCustomer: true,
    suggestedLinkCustomerId,
  };
}

export async function getCustomerEmailHistory(customerId: string): Promise<
  Array<{ subject: string; bodyText: string; from: string; receivedAt: Date; aiResponse?: string }>
> {
  const db = getAdminDb();
  const customer = await db.collection("customers").doc(customerId).get();
  if (!customer.exists) return [];

  const data = customer.data() as CustomerDoc;
  const emailIds: string[] = data.linkedEmailIds ?? [];

  if (emailIds.length === 0) return [];

  // Fetch in batches of 10 (Firestore "in" limit)
  const history: Array<{
    subject: string;
    bodyText: string;
    from: string;
    receivedAt: Date;
    aiResponse?: string;
  }> = [];

  for (let i = 0; i < emailIds.length; i += 10) {
    const batch = emailIds.slice(i, i + 10);
    const snap = await db
      .collection("emails")
      .where(FieldPath.documentId(), "in", batch)
      .get();

    for (const doc of snap.docs) {
      const d = doc.data();
      history.push({
        subject: d.subject,
        bodyText: d.bodyText,
        from: d.from,
        receivedAt: d.receivedAt?.toDate?.() ?? new Date(),
        aiResponse: d.aiResponse,
      });
    }
  }

  // Sort ascending by receivedAt
  history.sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());
  return history;
}
