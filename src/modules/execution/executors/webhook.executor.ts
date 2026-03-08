import type { ExecutableNode, ExecutionContext } from "../types.js";

export const executeWebhookNode = async (
  node: ExecutableNode,
) => {
  return node.outgoing;
};
