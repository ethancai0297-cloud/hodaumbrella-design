/**
 * Cloudflare Worker entry: serves the Vite build (static assets) and a small
 * API used by the Carton Mark editor to read shipping-mark images with
 * Qwen-VL (Alibaba DashScope, OpenAI-compatible endpoint).
 *
 * Secrets / variables (Cloudflare → Worker → Settings → Variables and Secrets):
 *   DASHSCOPE_API_KEY   required — your Qwen API key (sk-...)
 *   DASHSCOPE_BASE_URL  optional — default https://dashscope.aliyuncs.com/compatible-mode/v1
 *                       (use https://dashscope-intl.aliyuncs.com/compatible-mode/v1 for an
 *                       international / Singapore-region key)
 *   QWEN_MODEL          optional — default qwen-vl-max
 */
export interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  DASHSCOPE_API_KEY?: string;
  DASHSCOPE_BASE_URL?: string;
  QWEN_MODEL?: string;
}

const FIELDS = [
  "title", "customer", "orderNo", "madeIn", "cartonCount", "model",
  "colour", "quantity", "gw", "nw", "meas", "projectDescription",
] as const;

const SYSTEM_PROMPT = `You are an expert at reading carton shipping marks (唛头 / MAIN MARK / SIDE MARK) for export shipments.
Extract every visible field from the image and return ONLY a JSON object with exactly these keys:
${FIELDS.join(", ")}.
Preserve original casing and units exactly as printed (e.g. "20 PCS", "4.70 KGS", "24.5*22.5*18 CM", "MADE IN CHINA").
Use empty strings for fields you cannot see. Do not invent data. No markdown, no explanation — JSON only.
Field mapping:
- title: a short label for this variant, e.g. the colour/style name ("BLACK 20000 PCS")
- customer: the consignee / brand line, e.g. "SEMI LINE S.A. - POLAND"
- orderNo: the order or PO number, e.g. "HD-WIR26001"
- madeIn: country of origin line, e.g. "MADE IN CHINA"
- cartonCount: total carton count, the number after "OF" in "CARTON NO.   OF 500"
- model: MODELS / item / SKU
- colour: COLOUR
- quantity: QUANTITY per carton (with units)
- gw: G.W. gross weight (with units)
- nw: N.W. net weight (with units)
- meas: MEAS measurement (with units)
- projectDescription: any header note / packaging instruction above the table, if present.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });

function extractJson(text: string): Record<string, string> {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const raw = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of FIELDS) out[k] = typeof parsed[k] === "string" ? (parsed[k] as string) : parsed[k] == null ? "" : String(parsed[k]);
  return out;
}

async function analyzeMark(req: Request, env: Env): Promise<Response> {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!env.DASHSCOPE_API_KEY) return json({ error: "服务端未配置 DASHSCOPE_API_KEY" }, 500);

  let imageDataUrl: string | undefined;
  try {
    ({ imageDataUrl } = (await req.json()) as { imageDataUrl?: string });
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }
  if (!imageDataUrl || !imageDataUrl.startsWith("data:image/")) return json({ error: "imageDataUrl required" }, 400);
  if (imageDataUrl.length > 12_000_000) return json({ error: "图片过大，请压缩到 8MB 以内" }, 413);

  const base = (env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  const model = env.QWEN_MODEL || "qwen-vl-max";

  const upstream = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.DASHSCOPE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl } },
            { type: "text", text: "Extract the shipping mark fields from this image. Return JSON only." },
          ],
        },
      ],
    }),
  });

  if (!upstream.ok) {
    const txt = await upstream.text();
    console.error("DashScope error", upstream.status, txt);
    let detail = txt.slice(0, 300);
    try {
      const j = JSON.parse(txt) as { error?: { message?: string; code?: string }; message?: string; code?: string };
      detail = j.error?.message || j.message || j.error?.code || j.code || detail;
    } catch {}
    if (upstream.status === 401) return json({ error: `千问 API key 无效或未配置：${detail}` }, 500);
    if (upstream.status === 429) return json({ error: "调用过于频繁，请稍后再试" }, 429);
    return json({ error: `AI 请求失败 (${upstream.status})：${detail}`, endpoint: base, model }, 502);
  }

  const data = (await upstream.json()) as { choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }> };
  const content = data.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : (content ?? []).map((c) => c.text ?? "").join("");
  try {
    return json({ fields: extractJson(text) });
  } catch {
    console.error("Unparseable model output", text);
    return json({ error: "识别结果无法解析，请重试或换一张更清晰的图片" }, 502);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/api/analyze-mark") return analyzeMark(req, env);
    if (url.pathname.startsWith("/api/")) return json({ error: "not found" }, 404);
    return env.ASSETS.fetch(req);
  },
};
