import { prisma } from "../../../lib/prisma.js";
import { getNodeLabel } from "../../../services/label.service.js";
import { resolveVariables } from "../../../services/resolver.service.js";
import type { ConditionConfig, ExecutableNode, ExecutionContext } from "../types.js";

export const executeConditionNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
  parentLabel?: string,
): Promise<number[]> => {
  const { nodeResults, allNodes } = context;
  const config = node.config as unknown as ConditionConfig;
  const label = getNodeLabel(node);

  const rawTargetValue = resolveVariables(config.fieldName, nodeResults);
  const { operator, valueType, trueNodeId, falseNodeId } = config;

  let comparison = config.compareValue;
  let target = rawTargetValue;

  if (valueType === "number") {
    comparison =
      comparison === "-" || comparison === "" ? 0 : Number(comparison);
    target = Number(rawTargetValue);
  }

  let isPassed = false;
  switch (operator) {
    case "equals":
      isPassed = target === comparison;
      break;
    case "not_equals":
      isPassed = target !== comparison;
      break;
    case "contains":
      isPassed = String(target).includes(String(comparison));
      break;
    case "starts_with":
      isPassed = String(target).startsWith(String(comparison));
      break;
    case "greater_than":
      isPassed = target > comparison;
      break;
    case "less_than":
      isPassed = target < comparison;
      break;
    case "exists":
      isPassed =
        rawTargetValue !== undefined &&
        rawTargetValue !== null &&
        rawTargetValue !== "";
      break;
    default:
      isPassed = false;
  }

  const nextNodeId = isPassed ? trueNodeId : falseNodeId;
  const nextIndex = allNodes.findIndex((n) => n.id === nextNodeId);

  const parentData = parentLabel ? nodeResults[parentLabel] || {} : {};

  const detailedResult = {
    ...parentData,
    condition_metadata: {
      compared_from: target,
      compared_to: comparison,
      evaluation_result: isPassed,
      condition: operator,
      value_type: valueType,
    },
  };

  await prisma.node.update({
    where: { id: node.id },
    data: {
      result: detailedResult,
      status: "success",
    },
  });
  nodeResults[label] = parentData;

  return nextIndex !== -1 ? [nextIndex] : [];
};
