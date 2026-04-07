import type { AgentMode, LogEntry, PlanStep } from "../types/agent";
import { streamClaude, streamGroq } from "./claudeStream";

const AGENT_SYSTEM_PROMPT = (
  mode: AgentMode,
) => `You are Caffeine Agent — an expert AI coding assistant and engineer with deep expertise in:
- Software architecture, system design, full-stack development
- Writing complete, production-quality code in any language or framework
- Analyzing codebases, debugging, and proposing precise fixes
- Planning multi-step tasks and breaking them into clear execution steps
- Deploying applications, CI/CD pipelines, and infrastructure

You ALWAYS:
1. Lead with the direct answer — no preamble, no restating the question
2. Write COMPLETE, working code — never pseudocode or placeholders
3. Use precise technical language — be specific about function names, file paths, libraries
4. Format with markdown: **bold** for key terms, \`code\` for inline, fenced blocks for multi-line code
5. Include file paths and context when writing code
6. Explain the "why" in one sentence when needed, but never over-explain
7. For complex tasks: break down into numbered steps, then execute each step fully

When asked to build something:
- Output the COMPLETE code, not snippets
- Include all imports, types, and edge case handling
- Provide the file structure if multiple files are needed

Mode context:
- Caffeine Mode: ultra-fast, direct, minimal explanation
- Normal Mode: clear explanations with complete code
- Deep Mode: thorough analysis, architectural rationale, complete implementation

Current mode: ${mode.toUpperCase()}`;

const PLAN_SYSTEM_PROMPT = `You are a task analysis AI. Analyze the user's task and respond with ONLY a valid JSON array of plan steps. No explanation, no markdown, no extra text — only the raw JSON array.

Format exactly:
[{"stepNumber": 1, "description": "..."}, {"stepNumber": 2, "description": "..."}, ...]

Generate 3–5 clear, specific steps that accurately reflect what needs to happen to complete the task. Each description should be concrete and action-oriented (e.g. "Parse the codebase for React component definitions" not "Analyze the code").

Respond with ONLY the JSON array.`;

interface OrchestrateParams {
  userMessage: string;
  conversationHistory: { role: string; content: string }[];
  keys: { claude: string; groq: string; openai: string };
  mode: AgentMode;
  onToken: (token: string) => void;
  onPlanUpdate: (steps: PlanStep[]) => void;
  onLogUpdate: (entries: LogEntry[]) => void;
}

interface OrchestrateResult {
  text: string;
  model: "claude" | "groq" | "none";
  planSteps: PlanStep[];
}

function makeLog(
  message: string,
  status: LogEntry["status"],
  offset = 0,
): LogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2)}-${offset}`,
    timestamp: Date.now() + offset,
    message,
    status,
  };
}

function makePlanStep(stepNumber: number, description: string): PlanStep {
  return {
    id: `ps-${Date.now()}-${stepNumber}`,
    stepNumber,
    description,
    status: "pending",
  };
}

async function generatePlanWithClaude(
  userMessage: string,
  apiKey: string,
): Promise<PlanStep[]> {
  let rawJson = "";
  await streamClaude(
    [{ role: "user", content: `Task: ${userMessage}` }],
    apiKey,
    (token) => {
      rawJson += token;
    },
    "claude-3-haiku-20240307",
    PLAN_SYSTEM_PROMPT,
  );
  return parsePlanJson(rawJson);
}

async function generatePlanWithGroq(
  userMessage: string,
  apiKey: string,
): Promise<PlanStep[]> {
  let rawJson = "";
  await streamGroq(
    [{ role: "user", content: `Task: ${userMessage}` }],
    apiKey,
    (token) => {
      rawJson += token;
    },
    "llama3-8b-8192",
    PLAN_SYSTEM_PROMPT,
  );
  return parsePlanJson(rawJson);
}

function parsePlanJson(raw: string): PlanStep[] {
  try {
    // Extract JSON array even if there's extra text
    const match = raw.match(/\[\s*\{[\s\S]*?\}\s*\]/);
    const jsonStr = match ? match[0] : raw.trim();
    const parsed = JSON.parse(jsonStr) as Array<{
      stepNumber: number;
      description: string;
    }>;
    if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Empty");
    return parsed
      .filter((s) => s.stepNumber && s.description)
      .slice(0, 6)
      .map((s) => makePlanStep(s.stepNumber, s.description));
  } catch {
    // Return a generic fallback plan if parsing fails
    return [
      makePlanStep(1, "Analyze request and gather context"),
      makePlanStep(2, "Plan implementation approach"),
      makePlanStep(3, "Execute and generate response"),
      makePlanStep(4, "Verify and finalize output"),
    ];
  }
}

export async function orchestrateAgent(
  params: OrchestrateParams,
): Promise<OrchestrateResult> {
  const {
    userMessage,
    conversationHistory,
    keys,
    mode,
    onToken,
    onPlanUpdate,
    onLogUpdate,
  } = params;

  const currentLogs: LogEntry[] = [];

  function pushLog(entry: LogEntry) {
    currentLogs.push(entry);
    onLogUpdate([...currentLogs]);
  }

  // Phase 1: Init
  pushLog(makeLog("[INIT] Classifying task type...", "running", 0));

  // Detect task type for classification
  const lower = userMessage.toLowerCase();
  let taskType = "analysis";
  if (
    lower.includes("deploy") ||
    lower.includes("release") ||
    lower.includes("publish")
  ) {
    taskType = "deployment";
  } else if (
    lower.includes("code") ||
    lower.includes("fix") ||
    lower.includes("implement") ||
    lower.includes("write") ||
    lower.includes("build") ||
    lower.includes("refactor") ||
    lower.includes("create")
  ) {
    taskType = "coding";
  } else if (
    lower.includes("search") ||
    lower.includes("find") ||
    lower.includes("look") ||
    lower.includes("what")
  ) {
    taskType = "search";
  }

  // Phase 2: Generate real plan from AI
  let planSteps: PlanStep[] = [];

  if (keys.claude) {
    try {
      planSteps = await generatePlanWithClaude(userMessage, keys.claude);
    } catch (err) {
      console.warn("Claude plan gen failed, trying Groq:", err);
      if (keys.groq) {
        try {
          planSteps = await generatePlanWithGroq(userMessage, keys.groq);
        } catch (gErr) {
          console.warn("Groq plan gen failed:", gErr);
          planSteps = parsePlanJson(""); // fallback generic plan
        }
      } else {
        planSteps = parsePlanJson("");
      }
    }
  } else if (keys.groq) {
    try {
      planSteps = await generatePlanWithGroq(userMessage, keys.groq);
    } catch (err) {
      console.warn("Groq plan gen failed:", err);
      planSteps = parsePlanJson("");
    }
  } else {
    planSteps = parsePlanJson("");
  }

  // Emit plan immediately
  onPlanUpdate([...planSteps]);

  // Phase 2 logs: classification + plan ready
  currentLogs[0] = makeLog(
    `[CONTROLLER] Task classified: ${taskType}`,
    "completed",
    0,
  );
  pushLog(
    makeLog(
      `[PLANNER] Generated ${planSteps.length} execution steps`,
      "completed",
      1,
    ),
  );

  // Phase 3: Begin streaming main answer
  pushLog(makeLog("[EXECUTOR] Streaming AI response...", "running", 2));

  // Animate plan steps in progress as we stream
  let streamedChars = 0;
  let planAnimIndex = 0;
  const totalSteps = planSteps.length;

  const animatedPlan = planSteps.map((s) => ({ ...s }));

  // Set first step to in-progress
  if (animatedPlan.length > 0) {
    animatedPlan[0].status = "in-progress";
    onPlanUpdate([...animatedPlan]);
  }

  let fullText = "";
  let modelUsed: "claude" | "groq" | "none" = "none";

  const wrappedOnToken = (token: string) => {
    fullText += token;
    streamedChars += token.length;
    onToken(token);

    // Progressively advance plan steps based on streaming progress
    if (totalSteps > 0) {
      const charsPerStep = 200; // rough chars per step
      const expectedStep = Math.min(
        Math.floor(streamedChars / charsPerStep),
        totalSteps - 1,
      );
      if (expectedStep > planAnimIndex) {
        for (let i = planAnimIndex; i < expectedStep; i++) {
          animatedPlan[i].status = "done";
        }
        if (expectedStep < totalSteps) {
          animatedPlan[expectedStep].status = "in-progress";
        }
        planAnimIndex = expectedStep;
        onPlanUpdate([...animatedPlan]);
      }
    }
  };

  const systemPrompt = AGENT_SYSTEM_PROMPT(mode);

  if (keys.claude) {
    try {
      const text = await streamClaude(
        conversationHistory,
        keys.claude,
        wrappedOnToken,
        "claude-3-5-sonnet-20241022",
        systemPrompt,
      );
      fullText = text;
      modelUsed = "claude";
    } catch (err) {
      const isNetworkErr =
        err instanceof TypeError &&
        (err.message.includes("Failed to fetch") ||
          err.message.includes("NetworkError") ||
          err.message.includes("CORS"));
      if (!isNetworkErr) {
        console.warn("Claude stream failed, falling back to Groq:", err);
      }
      // Try Groq fallback
      if (keys.groq) {
        try {
          const text = await streamGroq(
            conversationHistory,
            keys.groq,
            wrappedOnToken,
            "llama3-70b-8192",
            systemPrompt,
          );
          fullText = text;
          modelUsed = "groq";
        } catch (gErr) {
          console.warn("Groq stream failed:", gErr);
        }
      }
    }
  } else if (keys.groq) {
    try {
      const text = await streamGroq(
        conversationHistory,
        keys.groq,
        wrappedOnToken,
        "llama3-70b-8192",
        systemPrompt,
      );
      fullText = text;
      modelUsed = "groq";
    } catch (err) {
      console.warn("Groq stream failed:", err);
    }
  }

  // No keys — emit help text
  if (modelUsed === "none") {
    const helpText =
      "**No API key configured.**\n\n" +
      "To get real AI responses, add a key via the **Key** icon in the sidebar:\n\n" +
      "- **Claude** (Best quality): [console.anthropic.com](https://console.anthropic.com)\n" +
      "- **Groq** (Free, fast): [console.groq.com](https://console.groq.com)\n\n" +
      "Once a key is saved, every task runs real AI — full streaming, real plans, real answers.";
    onToken(helpText);
    fullText = helpText;
  }

  // Finalize: mark all plan steps done
  const finalPlan = planSteps.map((s) => ({ ...s, status: "done" as const }));
  onPlanUpdate(finalPlan);

  // Final log entry
  pushLog(makeLog("[COMPLETE] Task completed successfully", "completed", 3));

  return { text: fullText, model: modelUsed, planSteps: finalPlan };
}
