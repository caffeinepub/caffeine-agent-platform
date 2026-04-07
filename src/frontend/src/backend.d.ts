import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface AgentConfig {
    learningScore: bigint;
    mode: RunMode;
}
export interface AgentConfigDTO {
    learningScore: bigint;
    mode: RunMode;
}
export type Time = bigint;
export interface MemoryEntryDTO {
    content: string;
    memoryType: MemoryType;
}
export interface MemoryEntry {
    content: string;
    timestamp: Time;
    memoryType: MemoryType;
}
export interface StrategyImprovementDTO {
    beforeStrategy: string;
    changeDescription: string;
    afterStrategy: string;
}
export interface StrategyImprovement {
    beforeStrategy: string;
    timestamp: Time;
    changeDescription: string;
    afterStrategy: string;
}
export interface LogEntryInput {
    status: LogStatus;
    message: string;
}
export interface LogEntry {
    status: LogStatus;
    message: string;
    timestamp: Time;
}
export interface ErrorLog {
    resolved: boolean;
    errorType: ErrorType;
    message: string;
    timestamp: Time;
}
export interface ErrorLogDTO {
    resolved: boolean;
    errorType: ErrorType;
    message: string;
}
export interface Message {
    content: string;
    role: Role;
    taskType: TaskType;
    timestamp: Time;
}
export interface ToolConnectionDTO {
    tool: Tool;
    connected: boolean;
}
export interface PlanStep {
    status: PlanStepStatus;
    description: string;
    stepNumber: bigint;
}
export interface ToolConnection {
    tool: Tool;
    connected: boolean;
}
export interface MessageInput {
    content: string;
    role: Role;
    taskType: TaskType;
}
export interface PlanStepDTO {
    status: PlanStepStatus;
    description: string;
    stepNumber: bigint;
}
export enum ErrorType {
    toolFailure = "toolFailure",
    logic = "logic",
    timeout = "timeout",
    parsing = "parsing"
}
export enum LogStatus {
    completed = "completed",
    error = "error",
    running = "running"
}
export enum MemoryType {
    action = "action",
    preference = "preference",
    session = "session"
}
export enum PlanStepStatus {
    pending = "pending",
    done = "done",
    error = "error",
    inProgress = "inProgress"
}
export enum Role {
    agent = "agent",
    user = "user"
}
export enum RunMode {
    normal = "normal",
    deep = "deep",
    caffeine = "caffeine"
}
export enum TaskType {
    deployment = "deployment",
    search = "search",
    coding = "coding",
    analysis = "analysis"
}
export enum Tool {
    deployment = "deployment",
    fileSystem = "fileSystem",
    gitHub = "gitHub"
}
export interface backendInterface {
    addErrorLog(input: ErrorLogDTO): Promise<void>;
    addLogEntry(input: LogEntryInput): Promise<void>;
    addMemoryEntry(input: MemoryEntryDTO): Promise<void>;
    addMessage(input: MessageInput): Promise<void>;
    addPlanStep(stepInput: PlanStepDTO): Promise<void>;
    addStrategyImprovement(input: StrategyImprovementDTO): Promise<void>;
    addTaskAgent(taskType: TaskType, agent: Principal): Promise<void>;
    addToolConnection(input: ToolConnectionDTO): Promise<void>;
    clearAllData(): Promise<void>;
    clearLogEntries(): Promise<void>;
    clearMessages(): Promise<void>;
    getAgentConfig(): Promise<AgentConfig>;
    getAllErrorLogs(): Promise<Array<ErrorLog>>;
    getAllLogEntries(): Promise<Array<LogEntry>>;
    getAllMemoryEntries(): Promise<Array<MemoryEntry>>;
    getAllMessages(): Promise<Array<Message>>;
    getAllPlanSteps(): Promise<Array<PlanStep>>;
    getAllStrategyImprovements(): Promise<Array<StrategyImprovement>>;
    getAllToolConnections(): Promise<Array<ToolConnection>>;
    getTaskAgent(taskType: TaskType): Promise<Principal>;
    incrementLearningScore(): Promise<bigint>;
    updateAgentConfig(newConfig: AgentConfigDTO): Promise<void>;
}
