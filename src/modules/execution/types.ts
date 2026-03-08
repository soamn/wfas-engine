import type { Node, NodeType } from "@prisma/client";

export type ExecutableNode = Node & {
  outgoing: number[];
};

export interface ExecutionContext {
  conn_id: number;
  nodeResults: Record<string, any>;
  allNodes: ExecutableNode[];
  workflowId: string;
}

export enum ProviderEnum {
  Discord = "Discord",
  Slack = "Slack",
  Telegram = "Telegram",
  GoogleSheets = "GoogleSheets",
  OpenRouter = "OpenRouter",
}

export type ActionBody = Record<string, any>;

export interface SetConfig {
  fields: Array<{
    key: string;
    type: "string" | "number" | "boolean";
    value: any; 
  }>;
}

export interface TriggerConfig {
  triggerType: "manual" | "schedule";
  cronExpression?: string;
}

export interface WebhookConfig {
  provider?: string;
  triggerMessage?: string;
}

export interface ActionConfig {
  provider: (typeof ProviderEnum)[keyof typeof ProviderEnum];
  body: any | null;
}

export interface ManualAPIConfig {
  apiEndpoint: string;
  method: "POST" | "GET";
  retry: number;
  timeout: number;
  body: any | null;
}

export interface FilterConfig {
  fieldName: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "starts_with"
    | "greater_than"
    | "less_than"
    | "exists";
  valueType: "text" | "number" | "boolean";
  compareValue: any;
}

export interface DelayConfig {
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
}

export interface ChatConfig {
  model: string;
  system?: string;
  user: string;
  temperature: number;
}

export interface TransformConfig {
  transforms: Array<{
    originalPath: string;
    changedKey: string;
    changedValue: string;
  }>;
}

export interface ExtractConfig {
  extractedPaths: string[];
}

export interface ConditionConfig {
  fieldName: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "starts_with"
    | "greater_than"
    | "less_than"
    | "exists";
  valueType: "text" | "number" | "boolean";
  compareValue: any;
  trueNodeId: string;
  falseNodeId: string;
}

export interface SwitchCase {
  id: string;
  operator: string;
  valueType: "text" | "number" | "boolean";
  compareValue: any;
  targetNodeId: string;
}

export interface SwitchConfig {
  referencePath: string;
  cases: SwitchCase[];
  showDefault: boolean;
  defaultNodeId?: string;
}

export interface LoopConfig {
  loopOver: string;
  maxIterations: number;
  iterateNodeId: string;
  nextNodeId: string;
}

export interface FailConfig {
  errorMessage: string;
}

export interface BaseNode {
  id: string;
  label: string | null;
  index: number;
  position: {
    x: number;
    y: number;
  };
  result: any | null;
  status: "idle" | "running" | "success" | "failed";
  error: string | null;
  outgoing: number[];
  connections: Array<{
    sourceNodeId: string;
    targetNodeId: string;
    sourceHandle: string | null;
    targetHandle: string | null;
  }>;
}
