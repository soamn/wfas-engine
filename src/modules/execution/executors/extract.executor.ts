import { prisma } from "../../../lib/prisma.js";
import { getNodeLabel } from "../../../services/label.service.js";
import { resolveVariables } from "../../../services/resolver.service.js";
import type {
  ExtractConfig,
  ExecutableNode,
  ExecutionContext,
} from "../types.js";

export const executeExtractNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
) => {
  const { nodeResults } = context;
  const config = node.config as unknown as ExtractConfig;
  const label = getNodeLabel(node);

  const extractedResult: Record<string, any> = {};

  if (config.extractedPaths && config.extractedPaths.length > 0) {
    config.extractedPaths.forEach((path) => {
      const value = resolveVariables(`{{${path}}}`, nodeResults);
      const key = path.split(".").pop() || path;
      if (value !== undefined) {
        extractedResult[key] = value;
      }
    });
  }

  await prisma.node.update({
    where: { id: node.id },
    data: {
      result: extractedResult,
      status: "success",
    },
  });

  nodeResults[label] = extractedResult;

  return node.outgoing;
};
