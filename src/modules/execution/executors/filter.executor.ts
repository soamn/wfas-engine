import { prisma } from "../../../lib/prisma.js";
import { getNodeLabel } from "../../../services/label.service.js";
import { resolveVariables } from "../../../services/resolver.service.js";
import type { ExecutableNode, ExecutionContext, FilterConfig } from "../types.js";

export const executeFilterNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
  parentLabel?: string,
) => {
  const { nodeResults } = context;
  const config = node.config as unknown as FilterConfig;
  const label = getNodeLabel(node);

  const rawTargetValue = resolveVariables(config.fieldName, nodeResults);
  const { operator, compareValue, valueType } = config;

  let target: any = rawTargetValue;
  let comparison: any = compareValue;

  if (valueType === "number") {
    target = Number(rawTargetValue);
    comparison = Number(compareValue);
  } else if (valueType === "text") {
    target = String(rawTargetValue);
    comparison = String(compareValue);
  } else if (valueType === "boolean") {
    target = String(rawTargetValue).toLowerCase() === "true";
    comparison = String(compareValue).toLowerCase() === "true";
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

  const parentData = parentLabel ? nodeResults[parentLabel] || {} : {};
  const detailedResult = {
    ...parentData,
    filter_metadata: {
      value_compared: target,
      compared_to: comparison,
      operator,
      passed: isPassed,
    },
  };

  await prisma.node.update({
    where: { id: node.id },
    data: {
      result: isPassed
        ? detailedResult
        : { error: "Filter failed", ...detailedResult },
      status: isPassed ? "success" : "failed",
      error: isPassed
        ? null
        : `Condition not met: ${target} ${operator} ${comparison}`,
    },
  });
  if (isPassed) {
    nodeResults[label] = parentData;
    return node.outgoing;
  }
  nodeResults[label] = { error: "Filter stopped execution" };
  return [];
};
