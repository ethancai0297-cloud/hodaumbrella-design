// Analyze a shipping mark image and extract structured fields using Lovable AI (Gemini vision)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageDataUrl } = await req.json();
    if (!imageDataUrl) {
      return new Response(JSON.stringify({ error: "imageDataUrl required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert at reading carton shipping marks (唛头 / MAIN MARK / SIDE MARK) for export shipments.
Extract every visible field from the image and return ONLY JSON via the provided tool.
Preserve original casing and units exactly as printed (e.g. "20 PCS", "4.70 KGS", "24.5*22.5*18 CM", "MADE IN CHINA").
Use empty strings for fields you cannot see. Do not invent data.
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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the shipping mark fields from this image." },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_shipping_mark",
            description: "Return extracted shipping mark fields",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                customer: { type: "string" },
                orderNo: { type: "string" },
                madeIn: { type: "string" },
                cartonCount: { type: "string" },
                model: { type: "string" },
                colour: { type: "string" },
                quantity: { type: "string" },
                gw: { type: "string" },
                nw: { type: "string" },
                meas: { type: "string" },
                projectDescription: { type: "string" },
              },
              required: [],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_shipping_mark" } },
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("AI gateway error", response.status, txt);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "调用过于频繁,请稍后再试" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI 额度已用尽,请在 Lovable 设置中充值" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI 请求失败" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};

    return new Response(JSON.stringify({ fields: args }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
