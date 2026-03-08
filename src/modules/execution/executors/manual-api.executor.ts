import { getNodeLabel } from "../../../services/label.service.js";
import { updateNodeState } from "../execution.service.js";
import type {
  ExecutableNode,
  ExecutionContext,
  ManualAPIConfig,
} from "../types.js";

export const executeManualAPI = async (
  node: ExecutableNode,
  context: ExecutionContext,
) => {
  const { nodeResults } = context;
  const config = node.config as unknown as ManualAPIConfig;

  const requestBody: Record<string, any> = {};
  if (config.body && Array.isArray(config.body)) {
    config.body.forEach((item) => {
      requestBody[item.key] = item.value;
    });
  }

  const body = JSON.stringify(requestBody);
  const maxRetries = config.retry || 0;
  let attempt = 0;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      (config.timeout || 10) * 1000,
    );

    try {
      const response = await fetch(config.apiEndpoint, {
        method: config.method || "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: config.method === "POST" ? body : null,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Server returned ${response.status}: ${errorText.slice(0, 50)}`,
        );
      }

      const result = await response.json();

      await updateNodeState(node.id, "success", result, null);

      const label = getNodeLabel(node);
      nodeResults[label] = result;

      return node.outgoing;
    } catch (error: any) {
      clearTimeout(timeoutId);
      attempt++;

      const isLastAttempt = attempt > maxRetries;

      if (isLastAttempt) {
        await updateNodeState(
          node.id,
          "failed",
          undefined,
          error.message || "An unknown error occurred",
        );
        return [];
      }

      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
};
