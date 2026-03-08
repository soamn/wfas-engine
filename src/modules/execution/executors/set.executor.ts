import { prisma } from "../../../lib/prisma.js";
import { getNodeLabel } from "../../../services/label.service.js";
import { resolveVariables } from "../../../services/resolver.service.js";
import type { ExecutableNode, ExecutionContext, SetConfig } from "../types.js";

export const executeSetNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
  parentLabel?: string,
) => {
  const { nodeResults } = context;
  const config = node.config as unknown as SetConfig;
  const label = getNodeLabel(node);

  if (!config || !config.fields) return node.outgoing;

  const parentData = parentLabel ? nodeResults[parentLabel] || {} : {};

  const resolvedFields = resolveVariables(config.fields, nodeResults);
  const newFieldsData: Record<string, any> = {};

  if (Array.isArray(resolvedFields)) {
    resolvedFields.forEach((field: any) => {
      if (field.key) {
        newFieldsData[field.key] = field.value;
      }
    });
  }

  const mergedResult = {
    ...parentData,
    ...newFieldsData,
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
