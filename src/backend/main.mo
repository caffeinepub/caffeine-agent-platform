import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Order "mo:core/Order";
import List "mo:core/List";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";

actor {
  type RunMode = {
    #caffeine;
    #normal;
    #deep;
  };

  type Role = {
    #user;
    #agent;
  };

  type TaskType = {
    #analysis;
    #coding;
    #deployment;
    #search;
  };

  module TaskTypeHelper {
    public func toText(taskType : TaskType) : Text {
      switch (taskType) {
        case (#analysis) { "analysis" };
        case (#coding) { "coding" };
        case (#deployment) { "deployment" };
        case (#search) { "search" };
      };
    };
  };

  type LogStatus = {
    #running;
    #completed;
    #error;
  };

  type PlanStepStatus = {
    #pending;
    #inProgress;
    #done;
    #error;
  };

  type ErrorType = {
    #timeout;
    #parsing;
    #toolFailure;
    #logic;
  };

  type Tool = {
    #gitHub;
    #deployment;
    #fileSystem;
  };

  type ToolConnection = {
    tool : Tool;
    connected : Bool;
  };

  module ToolConnection {
    public func compare(conn1 : ToolConnection, conn2 : ToolConnection) : Order.Order {
      switch (compareTool(conn1.tool, conn2.tool)) {
        case (#equal) { compareBool(conn1.connected, conn2.connected) };
        case (order) { order };
      };
    };

    func compareTool(tool1 : Tool, tool2 : Tool) : Order.Order {
      switch (tool1, tool2) {
        case (#gitHub, #gitHub) { #equal };
        case (#deployment, #deployment) { #equal };
        case (#fileSystem, #fileSystem) { #equal };
        case (#gitHub, _) { #less };
        case (_, #gitHub) { #greater };
        case (#deployment, _) { #less };
        case (_, #deployment) { #greater };
      };
    };

    func compareBool(b1 : Bool, b2 : Bool) : Order.Order {
      switch (b1, b2) {
        case (true, false) { #greater };
        case (false, true) { #less };
        case (_, _) { #equal };
      };
    };
  };

  type MemoryType = {
    #action;
    #preference;
    #session;
  };

  type AgentConfig = {
    mode : RunMode;
    learningScore : Nat;
  };

  type Message = {
    role : Role;
    content : Text;
    timestamp : Time.Time;
    taskType : TaskType;
  };

  type LogEntry = {
    timestamp : Time.Time;
    message : Text;
    status : LogStatus;
  };

  type PlanStep = {
    stepNumber : Nat;
    description : Text;
    status : PlanStepStatus;
  };

  type ErrorLog = {
    errorType : ErrorType;
    message : Text;
    timestamp : Time.Time;
    resolved : Bool;
  };

  type StrategyImprovement = {
    timestamp : Time.Time;
    changeDescription : Text;
    beforeStrategy : Text;
    afterStrategy : Text;
  };

  type MemoryEntry = {
    memoryType : MemoryType;
    content : Text;
    timestamp : Time.Time;
  };

  module PlanStep {
    public func compare(step1 : PlanStep, step2 : PlanStep) : Order.Order {
      compareNat(step1.stepNumber, step2.stepNumber);
    };

    func compareNat(n1 : Nat, n2 : Nat) : Order.Order {
      if (n1 < n2) { #less } else if (n1 > n2) { #greater } else { #equal };
    };
  };

  // ---- File Manager Types ----

  type FileRecord = {
    id : Text;
    name : Text;
    folderId : ?Text;
    mimeType : Text;
    size : Nat;
    blobKey : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
    isFolder : Bool;
  };

  type FileInput = {
    name : Text;
    folderId : ?Text;
    mimeType : Text;
    size : Nat;
    blobKey : Text;
    isFolder : Bool;
  };

  type FileUpdateInput = {
    name : Text;
    folderId : ?Text;
    mimeType : Text;
    size : Nat;
    blobKey : Text;
  };

  type StorageStats = {
    totalFiles : Nat;
    totalFolders : Nat;
    totalBytes : Nat;
  };

  // ---- DTOs ----

  type AgentConfigDTO = {
    mode : RunMode;
    learningScore : Nat;
  };

  type MessageInput = {
    role : Role;
    content : Text;
    taskType : TaskType;
  };

  type LogEntryInput = {
    message : Text;
    status : LogStatus;
  };

  type PlanStepDTO = {
    stepNumber : Nat;
    description : Text;
    status : PlanStepStatus;
  };

  type ErrorLogDTO = {
    errorType : ErrorType;
    message : Text;
    resolved : Bool;
  };

  type StrategyImprovementDTO = {
    changeDescription : Text;
    beforeStrategy : Text;
    afterStrategy : Text;
  };

  type ToolConnectionDTO = {
    tool : Tool;
    connected : Bool;
  };

  type MemoryEntryDTO = {
    memoryType : MemoryType;
    content : Text;
  };

  // ---- State ----

  var agentConfig : AgentConfig = {
    mode = #normal;
    learningScore = 72;
  };

  let messages = List.empty<Message>();
  let logEntries = List.empty<LogEntry>();
  let planSteps = List.empty<PlanStep>();
  let errorLogs = List.empty<ErrorLog>();
  let strategyImprovements = List.empty<StrategyImprovement>();
  let toolConnections = List.empty<ToolConnection>();
  let memoryEntries = List.empty<MemoryEntry>();
  let fileRecords = Map.empty<Text, FileRecord>();

  var fileIdCounter : Nat = 0;

  let taskTypeAgents = Map.empty<Text, Principal>();

  // ---- Agent Config ----

  public shared ({ caller = _ }) func updateAgentConfig(newConfig : AgentConfigDTO) : async () {
    agentConfig := {
      mode = newConfig.mode;
      learningScore = newConfig.learningScore;
    };
  };

  public query ({ caller = _ }) func getAgentConfig() : async AgentConfig {
    agentConfig;
  };

  public shared ({ caller = _ }) func incrementLearningScore() : async Nat {
    agentConfig := {
      agentConfig with
      learningScore = agentConfig.learningScore + 1;
    };
    agentConfig.learningScore;
  };

  // ---- Messages ----

  public shared ({ caller = _ }) func addMessage(input : MessageInput) : async () {
    let message : Message = {
      input with
      timestamp = Time.now();
    };
    messages.add(message);
  };

  public query ({ caller = _ }) func getAllMessages() : async [Message] {
    messages.toArray();
  };

  public shared ({ caller = _ }) func clearMessages() : async () {
    messages.clear();
  };

  // ---- Log Entries ----

  public shared ({ caller = _ }) func addLogEntry(input : LogEntryInput) : async () {
    let entry : LogEntry = {
      input with
      timestamp = Time.now();
    };
    logEntries.add(entry);
  };

  public query ({ caller = _ }) func getAllLogEntries() : async [LogEntry] {
    logEntries.toArray();
  };

  public shared ({ caller = _ }) func clearLogEntries() : async () {
    logEntries.clear();
  };

  // ---- Plan Steps ----

  public shared ({ caller = _ }) func addPlanStep(stepInput : PlanStepDTO) : async () {
    planSteps.add(stepInput);
  };

  public query ({ caller = _ }) func getAllPlanSteps() : async [PlanStep] {
    planSteps.toArray().sort();
  };

  // ---- Error Logs ----

  public shared ({ caller = _ }) func addErrorLog(input : ErrorLogDTO) : async () {
    let errorLog : ErrorLog = {
      input with
      timestamp = Time.now();
    };
    errorLogs.add(errorLog);
  };

  public query ({ caller = _ }) func getAllErrorLogs() : async [ErrorLog] {
    errorLogs.toArray();
  };

  // ---- Strategy Improvements ----

  public shared ({ caller = _ }) func addStrategyImprovement(input : StrategyImprovementDTO) : async () {
    let improvement : StrategyImprovement = {
      input with
      timestamp = Time.now();
    };
    strategyImprovements.add(improvement);
  };

  public query ({ caller = _ }) func getAllStrategyImprovements() : async [StrategyImprovement] {
    strategyImprovements.toArray();
  };

  // ---- Tool Connections ----

  public shared ({ caller = _ }) func addToolConnection(input : ToolConnectionDTO) : async () {
    let connection : ToolConnection = input;
    toolConnections.add(connection);
  };

  public query ({ caller = _ }) func getAllToolConnections() : async [ToolConnection] {
    toolConnections.toArray().sort();
  };

  // ---- Memory Entries ----

  public shared ({ caller = _ }) func addMemoryEntry(input : MemoryEntryDTO) : async () {
    let memory : MemoryEntry = {
      input with
      timestamp = Time.now();
    };
    memoryEntries.add(memory);
  };

  public query ({ caller = _ }) func getAllMemoryEntries() : async [MemoryEntry] {
    memoryEntries.toArray();
  };

  // ---- Clear All ----

  public shared ({ caller = _ }) func clearAllData() : async () {
    messages.clear();
    logEntries.clear();
    planSteps.clear();
    errorLogs.clear();
    strategyImprovements.clear();
    toolConnections.clear();
    memoryEntries.clear();
  };

  // ---- Task Agents ----

  public shared ({ caller = _ }) func addTaskAgent(taskType : TaskType, agent : Principal) : async () {
    taskTypeAgents.add(TaskTypeHelper.toText(taskType), agent);
  };

  public query ({ caller = _ }) func getTaskAgent(taskType : TaskType) : async Principal {
    switch (taskTypeAgents.get(TaskTypeHelper.toText(taskType))) {
      case (null) { Runtime.trap("No agent assigned for this task type") };
      case (?agent) { agent };
    };
  };

  // ---- File Manager ----

  public shared ({ caller = _ }) func createFile(input : FileInput) : async Text {
    fileIdCounter += 1;
    let id = "file-" # fileIdCounter.toText();
    let now = Time.now();
    let record : FileRecord = {
      id;
      name = input.name;
      folderId = input.folderId;
      mimeType = input.mimeType;
      size = input.size;
      blobKey = input.blobKey;
      createdAt = now;
      updatedAt = now;
      isFolder = input.isFolder;
    };
    fileRecords.add(id, record);
    id;
  };

  public query ({ caller = _ }) func getFiles(folderId : ?Text) : async [FileRecord] {
    fileRecords.entries().toArray()
      .filter(func(kv : (Text, FileRecord)) : Bool {
        let f = kv.1;
        switch (folderId, f.folderId) {
          case (null, null) { true };
          case (?a, ?b) { a == b };
          case _ { false };
        };
      })
      .map(func(kv : (Text, FileRecord)) : FileRecord { kv.1 });
  };

  public query ({ caller = _ }) func getAllFiles() : async [FileRecord] {
    fileRecords.entries().toArray()
      .map(func(kv : (Text, FileRecord)) : FileRecord { kv.1 });
  };

  public query ({ caller = _ }) func getFile(id : Text) : async ?FileRecord {
    fileRecords.get(id);
  };

  public shared ({ caller = _ }) func updateFile(id : Text, input : FileUpdateInput) : async Bool {
    switch (fileRecords.get(id)) {
      case (null) { false };
      case (?existing) {
        let updated : FileRecord = {
          existing with
          name = input.name;
          folderId = input.folderId;
          mimeType = input.mimeType;
          size = input.size;
          blobKey = input.blobKey;
          updatedAt = Time.now();
        };
        fileRecords.add(id, updated);
        true;
      };
    };
  };

  public shared ({ caller = _ }) func deleteFile(id : Text) : async Bool {
    switch (fileRecords.get(id)) {
      case (null) { false };
      case (?_) {
        fileRecords.remove(id);
        true;
      };
    };
  };

  public query ({ caller = _ }) func getStorageStats() : async StorageStats {
    var totalFiles = 0;
    var totalFolders = 0;
    var totalBytes = 0;
    for (kv in fileRecords.entries()) {
      let f = kv.1;
      if (f.isFolder) {
        totalFolders += 1;
      } else {
        totalFiles += 1;
        totalBytes += f.size;
      };
    };
    { totalFiles; totalFolders; totalBytes };
  };
};
