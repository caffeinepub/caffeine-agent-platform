const AGENT_SYSTEM_PROMPT = `You are the Caffeine Agent — a powerful AI assistant and coding expert. You have deep expertise in:
- Software architecture, system design, and code generation
- Planning complex tasks and breaking them into executable steps
- Analyzing codebases, debugging, and writing production-quality code
- Deploying applications and managing infrastructure
- Answering technical questions with precision and clarity

When given a task:
1. Be direct and precise. Lead with the answer.
2. For coding tasks, write complete, working code — not pseudocode.
3. For analysis tasks, provide structured, actionable insights.
4. Use markdown formatting: **bold** for emphasis, \`code\` for inline code, code blocks for multi-line code.
5. Keep responses focused and high-signal. No filler.`;

/**
 * Parse an SSE stream from a ReadableStream body.
 * Calls onChunk with each raw line (including "data: ...").
 */
async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (line: string) => void,
): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the last (potentially incomplete) line in the buffer
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      onChunk(line);
    }
  }
  // Flush any remaining buffer
  if (buffer.trim()) onChunk(buffer);
}

/**
 * Stream tokens from the Anthropic Claude API.
 * Returns the full accumulated text.
 */
export async function streamClaude(
  messages: { role: string; content: string }[],
  apiKey: string,
  onToken: (token: string) => void,
  model = "claude-3-5-sonnet-20241022",
  systemPrompt?: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: true,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error ${res.status}: ${errText}`);
  }

  if (!res.body) throw new Error("No response body from Claude");

  let fullText = "";

  await readSSEStream(res.body, (line) => {
    if (!line.startsWith("data: ")) return;
    const data = line.slice(6).trim();
    if (data === "[DONE]") return;
    try {
      const event = JSON.parse(data);
      if (
        event.type === "content_block_delta" &&
        event.delta?.type === "text_delta"
      ) {
        const token = event.delta.text ?? "";
        fullText += token;
        onToken(token);
      }
    } catch {
      // Ignore parse errors on non-JSON lines
    }
  });

  return fullText;
}

/**
 * Stream tokens from the Groq API (OpenAI-compatible SSE format).
 * Returns the full accumulated text.
 */
export async function streamGroq(
  messages: { role: string; content: string }[],
  apiKey: string,
  onToken: (token: string) => void,
  model = "llama3-70b-8192",
  systemPrompt?: string,
): Promise<string> {
  const fullMessages = systemPrompt
    ? [{ role: "system", content: systemPrompt }, ...messages]
    : messages;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: true,
      messages: fullMessages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  if (!res.body) throw new Error("No response body from Groq");

  let fullText = "";

  await readSSEStream(res.body, (line) => {
    if (!line.startsWith("data: ")) return;
    const data = line.slice(6).trim();
    if (data === "[DONE]") return;
    try {
      const event = JSON.parse(data);
      const token = event.choices?.[0]?.delta?.content ?? "";
      if (token) {
        fullText += token;
        onToken(token);
      }
    } catch {
      // Ignore parse errors
    }
  });

  return fullText;
}

/**
 * Pick the best available model and stream the response.
 * Priority: Claude (if key available) → Groq (if key available) → no-key message.
 */
export async function streamAgent(
  messages: { role: string; content: string }[],
  keys: { claude: string; groq: string; openai: string },
  onToken: (token: string) => void,
): Promise<{ text: string; model: "claude" | "groq" | "none" }> {
  // Try Claude first
  if (keys.claude) {
    try {
      const text = await streamClaude(
        messages,
        keys.claude,
        onToken,
        "claude-3-5-sonnet-20241022",
        AGENT_SYSTEM_PROMPT,
      );
      return { text, model: "claude" };
    } catch (err) {
      // Check if it's a CORS/network error — fall back to Groq
      const isNetworkErr =
        err instanceof TypeError &&
        (err.message.includes("Failed to fetch") ||
          err.message.includes("NetworkError") ||
          err.message.includes("CORS"));
      if (!isNetworkErr) {
        // API error (bad key, rate limit, etc.) — still fall back but also try Groq
        console.warn("Claude API error, falling back to Groq:", err);
      }
    }
  }

  // Try Groq as fallback
  if (keys.groq) {
    try {
      const text = await streamGroq(
        messages,
        keys.groq,
        onToken,
        "llama3-70b-8192",
        AGENT_SYSTEM_PROMPT,
      );
      return { text, model: "groq" };
    } catch (err) {
      console.warn("Groq API error:", err);
    }
  }

  // No keys available — return helpful message
  const helpText =
    "Please add a Claude or Groq API key via the Key icon in the sidebar.\n\n" +
    "- **Claude** (Best): Get a key at [console.anthropic.com](https://console.anthropic.com)\n" +
    "- **Groq** (Free): Get a free key at [console.groq.com](https://console.groq.com)\n\n" +
    "Once you add a key, the agent will use real AI to answer your questions.";

  onToken(helpText);
  return { text: helpText, model: "none" };
}
