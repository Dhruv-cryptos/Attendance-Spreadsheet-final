const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MODEL = "gemini-2.0-flash";

const DATA_SYSTEM = `You are DataGuard AI's Data Intelligence Assistant. You help users understand and improve the quality of their tabular datasets.
You receive a deterministic dataset context (schema, quality scores, detected issues, sample rows) computed by a rules engine.
Rules:
- Treat the context as ground truth for statistics. NEVER invent or change numbers.
- Clearly separate "Detected facts" (from the context) from "AI suggestions" (your advice).
- If suggesting a correction, state the row, column and exact replacement value so the app can validate it.
- Be concise, use markdown, max ~250 words.`;

const SUPPORT_SYSTEM = `You are DataGuard AI's Customer Support Assistant. You help users operate the DataGuard AI product.
DataGuard AI: upload CSV/Excel datasets, automatic quality analysis (missing values, duplicates, invalid emails/dates/numbers, outliers, inconsistent categories, formatting), a 0-100 quality score (25% completeness + 30% validity + 25% uniqueness + 20% consistency), an approval-based cleaning studio with undo/redo/reset, CSV/JSON/Excel exports, printable reports, and history stored locally in the browser.
Rules:
- Answer only questions about DataGuard AI and general data-quality topics.
- Never claim to access the user's account, payments or private data.
- Be friendly, professional and concise, use markdown, max ~200 words.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  try {
    const { message, context, mode } = await req.json();
    if (typeof message !== "string" || message.trim() === "" || message.length > 8000) {
      return new Response(JSON.stringify({ error: "Invalid message." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ usedGemini: false, error: "GEMINI_API_KEY secret is not configured on the server." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const system = mode === "support" ? SUPPORT_SYSTEM : DATA_SYSTEM;
    const contents = [
      {
        role: "user",
        parts: [{ text: `Dataset context (deterministic, computed by the rules engine):\n${typeof context === "string" ? context.slice(0, 12000) : "(none)"}\n\nUser question:\n${message}` }],
      },
    ];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: mode === "support" ? 0.4 : 0.2, maxOutputTokens: 900 },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const status = res.status === 429 ? 429 : 502;
      return new Response(JSON.stringify({ usedGemini: false, error: `Gemini API error ${res.status}: ${body.slice(0, 300)}` }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const reply: string | undefined = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    if (!reply || reply.trim() === "") {
      return new Response(JSON.stringify({ usedGemini: false, error: "Gemini returned an empty response." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ reply, usedGemini: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

