export type IntegrationCategory =
  | "ai"
  | "cloud"
  | "database"
  | "devtools"
  | "apis";

export interface IntegrationConfig {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  icon: string;
  docsUrl?: string;
  capabilities: string[];
  configFields: ConfigField[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  placeholder: string;
  required: boolean;
}

export interface IntegrationState {
  id: string;
  connected: boolean;
  configValues: Record<string, string>;
  lastTested?: number;
  testStatus?: "success" | "error" | "pending";
}
