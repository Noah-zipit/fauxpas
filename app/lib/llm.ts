// LLM provider — NVIDIA NIM first (user's key), Groq as fallback, then null.
// Every caller must handle null gracefully: the agents are fully functional
// on deterministic logic; the LLM only sharpens the prose.

const NIM_KEY = process.env.NVIDIA_NIM_API_KEY || "";
const NIM_MODEL = process.env.NIM_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";
const GROQ_KEY = process.env.GROQ_API_KEY || "";

interface Msg { role: string; content?: string; tool_calls?: any[]; tool_call_id?: string; name?: string; }

async function callNim(messages: Msg[], opts: { temperature?: number; maxTokens?: number; tools?: any[] }): Promise<Msg | null> {
  if (!NIM_KEY) return null;
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${NIM_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: NIM_MODEL,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 400,
        messages,
        ...(opts.tools ? { tools: opts.tools } : {}),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const m = data?.choices?.[0]?.message;
    if (!m) return null;
    return { role: "assistant", content: m.content || undefined, tool_calls: m.tool_calls };
  } catch {
    return null;
  }
}

async function callGroq(messages: Msg[], opts: { temperature?: number; maxTokens?: number; tools?: any[] }): Promise<Msg | null> {
  if (!GROQ_KEY) return null;
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 400,
        messages,
        ...(opts.tools ? { tools: opts.tools } : {}),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const m = data?.choices?.[0]?.message;
    if (!m) return null;
    return { role: "assistant", content: m.content || undefined, tool_calls: m.tool_calls };
  } catch {
    return null;
  }
}

async function complete(messages: Msg[], opts: { temperature?: number; maxTokens?: number; tools?: any[] } = {}): Promise<Msg | null> {
  return (await callNim(messages, opts)) ?? (await callGroq(messages, opts)) ?? null;
}

/** Plain chat completion. Returns null when no provider is available. */
export async function chat(o: { system: string; user: string; temperature?: number; maxTokens?: number }): Promise<string | null> {
  const m = await complete(
    [{ role: "system", content: o.system }, { role: "user", content: o.user }],
    { temperature: o.temperature, maxTokens: o.maxTokens }
  );
  return m?.content?.trim() || null;
}

/** Which provider (if any) is configured. For the ledger. */
export function llmProvider(): string | null {
  if (NIM_KEY) return `NVIDIA NIM (${NIM_MODEL})`;
  if (GROQ_KEY) return "Groq (llama-3.3-70b)";
  return null;
}

/**
 * Tool-calling agent loop. The model may call tools; results are fed back
 * until it answers in text or maxIters is hit. Returns the final answer and
 * how many tool calls ran.
 */
export async function chatWithTools(o: {
  system: string;
  user: string;
  tools: any[];
  onTool: (name: string, args: any) => Promise<any>;
  maxIters?: number;
  temperature?: number;
  maxTokens?: number;
}): Promise<{ answer: string; toolRuns: number }> {
  const maxIters = o.maxIters ?? 3;
  const history: Msg[] = [
    { role: "system", content: o.system },
    { role: "user", content: o.user },
  ];
  let toolRuns = 0;
  for (let i = 0; i < maxIters; i++) {
    const msg = await complete(history, { temperature: o.temperature ?? 0.6, maxTokens: o.maxTokens ?? 450, tools: o.tools });
    if (!msg) return { answer: "", toolRuns };
    if (!msg.tool_calls?.length) return { answer: msg.content?.trim() || "", toolRuns };
    history.push({ role: "assistant", content: msg.content || undefined, tool_calls: msg.tool_calls });
    for (const tc of msg.tool_calls) {
      const name: string = tc.function?.name || "";
      let args: any = {};
      try { args = JSON.parse(tc.function?.arguments || "{}"); } catch {}
      const result = await o.onTool(name, args);
      toolRuns++;
      history.push({ role: "tool", tool_call_id: tc.id, name, content: JSON.stringify(result).slice(0, 4000) });
    }
  }
  const closing = await complete(
    [...history, { role: "user", content: "Answer the original question now, briefly, using the tool results above. Keep every number." }],
    { temperature: 0.5, maxTokens: 350 }
  );
  return { answer: closing?.content?.trim() || "", toolRuns };
}
