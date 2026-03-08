import { prisma } from "../../../lib/prisma.js";
import { getNodeLabel } from "../../../services/label.service.js";
import { resolveVariables } from "../../../services/resolver.service.js";
import type { ExecutableNode, ExecutionContext, TransformConfig } from "../types.js";

export const executeTransformNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
  parentLabel?: string,
) => {
  const { nodeResults } = context;
  const config = node.config as unknown as TransformConfig;
  const label = getNodeLabel(node);

  const parentData = parentLabel ? nodeResults[parentLabel] || {} : {};

  const transformedData: Record<string, any> = {};

  if (config.transforms && Array.isArray(config.transforms)) {
    config.transforms.forEach((item) => {
      const resolvedSource = resolveVariables(item.originalPath, nodeResults);

      const finalValue =
        item.changedValue.trim() !== ""
          ? resolveVariables(item.changedValue, nodeResults)
          : resolvedSource;

      if (item.changedKey) {
        transformedData[item.changedKey] = finalValue;
      }
    });
  }

  const mergedResult = {
    ...parentData,
    ...transformedData,
  };

  await prisma.node.update({
    where: { id: node.id },
    data: {
      result: mergedResult,
      status: "success",
    },
  });

  nodeResults[label] = mergedResult;

  return node.outgoing;
};
