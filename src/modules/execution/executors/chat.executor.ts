import { getCredential } from "../../../services/action.service.js";
import { getNodeLabel } from "../../../services/label.service.js";
import { resolveVariables } from "../../../services/resolver.service.js";
import { updateNodeState } from "../execution.service.js";
import {
  ProviderEnum,
  type ChatConfig,
  type ExecutableNode,
  type ExecutionContext,
} from "../types.js";

export const executeChatNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
): Promise<number[]> => {
  const { conn_id, nodeResults } = context;
  const config = node.config as unknown as ChatConfig;
  const label = getNodeLabel(node);

  try {
    const response = await getCredential(ProviderEnum.OpenRouter, conn_id);

    const result = await response.json();
    const creds = result.response;
    const apiKey = creds.credential.key;

    if (!apiKey) {
      throw new Error("Missing OpenRouter API Key in credentials");
    }

    const resolvedSystem = resolveVariables(config.system || "", nodeResults);
    const resolvedUser = resolveVariables(config.user, nodeResults);

    const chatResponse = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://your-app-domain.com",
          "X-Title": "Gemini Workflow Engine",
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            ...(resolvedSystem
              ? [{ role: "system", content: resolvedSystem }]
              : []),
            { role: "user", content: resolvedUser },
          ],
          temperature: config.temperature ?? 0.7,
        }),
      },
    );

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(
          errorData?.error?.message ||
            `OpenRouter Error ${chatResponse.status}`,
        );
      } catch {
        throw new Error(
          `OpenRouter returned ${chatResponse.status}: ${errorText}`,
        );
      }
    }

    const data = await chatResponse.json();

    const aiResponse = data.choices[0]?.message?.content;
    const resultMetadata = {
      text: aiResponse,
      usage: data.usage,
    };

    await updateNodeState(node.id, "success", resultMetadata, null);

    nodeResults[label] = resultMetadata;
    return node.outgoing;
  } catch (error: any) {
    await updateNodeState(
      node.id,
      "failed",
      undefined,
      error.message || "Failed to communicate with OpenRouter",
    );
    return [];
  }
};
