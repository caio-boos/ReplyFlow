const API = "https://api.replicate.com/v1";

const INPAINT_MODEL = process.env.REPLICATE_INPAINT_MODEL || "jd7h/propainter";

const CREDIT_MESSAGE =
  "O Replicate recusou por falta de crédito. Confirme em replicate.com/account/billing " +
  "que o crédito está na MESMA conta do token (veja o usuário em Configurações → Integrações). " +
  "Compras de crédito levam alguns minutos para liberar.";

function authHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

/** Extrai o campo `detail` do corpo de erro do Replicate. */
async function describeError(res: Response): Promise<string> {
  const body = await res.text();
  try {
    const parsed = JSON.parse(body);
    const detail = parsed.detail;
    if (Array.isArray(detail)) {
      // 422 do Cog: uma entrada por campo inválido.
      const lines = detail
        .map((item) => {
          const field = Array.isArray(item?.loc) ? item.loc.at(-1) : null;
          return [field, item?.msg].filter(Boolean).join(": ");
        })
        .filter(Boolean);
      if (lines.length > 0) return lines.join(" · ");
    }
    return detail || parsed.title || body;
  } catch {
    return body.slice(0, 200);
  }
}

/** Confere se o token é válido antes de salvar. */
export async function verifyReplicateToken(token: string): Promise<string> {
  const res = await fetch(`${API}/account`, {
    headers: authHeader(token),
    cache: "no-store",
  });
  if (res.status === 401) throw new Error("Token inválido ou expirado.");
  if (!res.ok) throw new Error(`Replicate respondeu ${res.status}.`);

  const data = await res.json();
  return typeof data?.username === "string" ? data.username : "conta";
}

interface ModelInfo {
  /** `null` em modelo oficial, que não publica versão e roda pelo endpoint do modelo. */
  versionId: string | null;
  /** `null` quando o schema não está exposto; nesse caso nada é filtrado. */
  inputKeys: Set<string> | null;
}

const modelCache = new Map<string, ModelInfo>();

/** Lê a versão e o schema de input do modelo para só enviar campos suportados. */
async function getModelInfo(token: string, slug: string): Promise<ModelInfo> {
  const cached = modelCache.get(slug);
  if (cached) return cached;

  const res = await fetch(`${API}/models/${slug}`, {
    headers: authHeader(token),
    cache: "no-store",
  });
  if (res.status === 404) {
    throw new Error(`Modelo "${slug}" não encontrado no Replicate.`);
  }
  if (!res.ok) throw new Error(`Replicate respondeu ${res.status}.`);

  const version = (await res.json())?.latest_version;
  const properties =
    version?.openapi_schema?.components?.schemas?.Input?.properties;

  const info: ModelInfo = {
    versionId: typeof version?.id === "string" ? version.id : null,
    inputKeys: properties ? new Set(Object.keys(properties)) : null,
  };
  modelCache.set(slug, info);
  return info;
}

export async function createPrediction(
  token: string,
  slug: string,
  input: Record<string, unknown>,
  requiredKeys: string[] = [],
): Promise<string> {
  const { versionId, inputKeys } = await getModelInfo(token, slug);

  const payload = Object.fromEntries(
    Object.entries(input).filter(
      ([key, value]) =>
        value !== undefined &&
        value !== null &&
        (!inputKeys || inputKeys.has(key)),
    ),
  );

  const missing = requiredKeys.filter((key) => payload[key] === undefined);
  if (missing.length > 0) {
    throw new Error(
      `Modelo "${slug}" não aceita as entradas necessárias: ${missing.join(", ")}.`,
    );
  }

  // Modelo oficial não tem versão pública: a predição vai pelo endpoint do modelo.
  const url = versionId ? `${API}/predictions` : `${API}/models/${slug}/predictions`;
  const body = versionId
    ? { version: versionId, input: payload }
    : { input: payload };

  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeader(token), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 402) throw new Error(CREDIT_MESSAGE);
  if (!res.ok) {
    throw new Error(`Replicate recusou o job (${res.status}): ${await describeError(res)}`);
  }

  const id = (await res.json())?.id;
  if (typeof id !== "string") {
    throw new Error("Replicate não retornou o id da predição.");
  }
  return id;
}

export function createInpaintPrediction(
  token: string,
  input: Record<string, unknown>,
): Promise<string> {
  return createPrediction(token, INPAINT_MODEL, input, ["video", "mask"]);
}

export interface PredictionState {
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string | null;
  error: string | null;
}

export async function getPrediction(
  token: string,
  id: string,
): Promise<PredictionState> {
  const res = await fetch(`${API}/predictions/${encodeURIComponent(id)}`, {
    headers: authHeader(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Replicate respondeu ${res.status}.`);

  const data = await res.json();
  const raw = data.output;
  const output =
    typeof raw === "string"
      ? raw
      : Array.isArray(raw) && typeof raw.at(-1) === "string"
        ? (raw.at(-1) as string)
        : null;

  return {
    status: data.status,
    output,
    error: data.error ? String(data.error) : null,
  };
}
