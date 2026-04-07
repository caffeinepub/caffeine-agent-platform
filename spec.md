# Caffeine Agent Platform — Version 6: Full Real AI Agent

## Current State
- `claudeStream.ts` — real streaming Claude + Groq API calls already implemented and working
- `agentSimulation.ts` — all plan steps, log entries, and agent responses are hardcoded/templated (fake)
- `ChatPanel.tsx` — calls `streamAgent()` for real streaming responses, BUT imports and uses `generatePlanSteps()`, `generateLogEntries()` from the simulation file (fake)
- `RightPanel.tsx` — displays plan steps + logs passed from App.tsx
- `App.tsx` — orchestrates agent state; still calls simulation functions to produce plans and logs before calling real `streamAgent()`
- `ControllerPanel.tsx`, `PlannerPanel.tsx`, `ExecutorPanel.tsx` — display static/hardcoded module data
- All other features (FileManager, Integrations, GitHub, AI Models tabs, CodeGen) are working

## Requested Changes (Diff)

### Add
- `aiAgentOrchestrator.ts` — new utility that:
  - Before streaming the answer, calls Claude/Groq with a structured prompt to generate a JSON plan (array of step objects with `stepNumber`, `description`)
  - Parses the JSON plan and returns typed `PlanStep[]`
  - Generates real log entries that reflect actual execution phases (classify → plan → execute → complete)
  - Exposes a streaming orchestration function: `orchestrateAgent(userMessage, keys, mode, onToken, onPlanUpdate, onLogUpdate)`
- Real dynamic system prompt that instructs the AI to first output a JSON plan block, then answer

### Modify
- `agentSimulation.ts` — keep only the `getTaskDelay()` helper (still used for timing), remove all other exports
- `App.tsx` / `ChatPanel.tsx` — replace `generatePlanSteps()` + `generateLogEntries()` + `generateAgentResponse()` calls with `orchestrateAgent()` from the new orchestrator
- Plan steps in the right panel should animate in as they arrive from the AI, not all at once
- Log entries should update progressively (classify → plan → execute → stream → done)
- `ControllerPanel.tsx` — show last task type classified by AI, with live status
- `PlannerPanel.tsx` — show current AI-generated plan steps with live status updates
- `ExecutorPanel.tsx` — show live execution log with real timestamps and AI-classified task type
- `ChatPanel.tsx` — after receiving the full response, mark all plan steps as "done", add a final log entry
- `CodeGenPanel.tsx` — already uses real Claude/Groq streaming; ensure it uses the same orchestrator system prompt for consistency

### Remove
- All fake `generatePlanSteps()`, `generateLogEntries()`, `generateAgentResponse()` logic from `agentSimulation.ts`
- All hardcoded plan templates and static log entry arrays

## Implementation Plan
1. Create `src/frontend/src/utils/aiAgentOrchestrator.ts`:
   - Define a plan-generation prompt that asks Claude/Groq to output a JSON block first
   - Parse the response for a ````json` block, extract plan steps
   - Stream the answer in real-time via `streamClaude()` / `streamGroq()`
   - Fire callbacks: `onPlanUpdate(steps)` and `onLogUpdate(entries)` at each phase
2. Update `agentSimulation.ts` — strip all simulation exports, keep only `getTaskDelay()`
3. Update `App.tsx` — replace simulation calls with `orchestrateAgent()`; pass `onPlanUpdate` and `onLogUpdate` callbacks that update state
4. Update `ChatPanel.tsx` — use orchestrator instead of simulation for all task handling
5. Update `ControllerPanel.tsx` — show real task type + status from last orchestration
6. Update `PlannerPanel.tsx` — bind to real plan steps state from App.tsx
7. Update `ExecutorPanel.tsx` — show real log entries state from App.tsx
8. Validate and deploy
