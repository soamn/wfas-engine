import { prisma } from "../../../lib/prisma.js";
import { getNodeLabel } from "../../../services/label.service.js";
import { resolveVariables } from "../../../services/resolver.service.js";
import type { ExecutableNode, ExecutionContext, SwitchConfig } from "../types.js";

export const evaluateSwitch = (
  config: SwitchConfig,
  incomingValue: any,
): string | null => {
  const { cases, showDefault, defaultNodeId } = config;

  for (const c of cases) {
    const { operator, compareValue, valueType } = c;

    if (operator === "exists") {
      if (
        incomingValue !== undefined &&
        incomingValue !== null &&
        incomingValue !== ""
      ) {
        return c.targetNodeId;
      }
      continue;
    }

    let leftSide = incomingValue;
    let rightSide = compareValue;

    if (valueType === "number") {
      leftSide = Number(incomingValue);
      rightSide = Number(compareValue);
    } else if (valueType === "boolean") {
      leftSide = String(incomingValue).toLowerCase() === "true";
      rightSide = Boolean(compareValue);
    } else {
      leftSide = String(incomingValue ?? "");
      rightSide = String(compareValue ?? "");
    }

    let isMatch = false;
    switch (operator) {
      case "equals":
        isMatch = leftSide === rightSide;
        break;
      case "not_equals":
        isMatch = leftSide !== rightSide;
        break;
      case "contains":
        isMatch = String(leftSide).includes(String(rightSide));
        break;
      case "starts_with":
        isMatch = String(leftSide).startsWith(String(rightSide));
        break;
      case "greater_than":
        isMatch = leftSide > rightSide;
        break;
      case "less_than":
        isMatch = leftSide < rightSide;
        break;
    }

    if (isMatch) return c.targetNodeId;
  }

  return showDefault ? defaultNodeId || null : null;
};

export const executeSwitchNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
  parentLabel?: string,
): Promise<number[]> => {
  const { nodeResults, allNodes } = context;
  const config = node.config as unknown as SwitchConfig;
  const label = getNodeLabel(node);
  const incomingValue = resolveVariables(
    `{{${config.referencePath}}}`,
    nodeResults,
  );
  const targetNodeId = evaluateSwitch(config, incomingValue);
  const nextIndex = allNodes.findIndex((n) => n.id === targetNodeId);
  const parentData = parentLabel ? nodeResults[parentLabel] || {} : {};
  const matchedCase = config.cases.find((c) => c.targetNodeId === targetNodeId);
  const executionMetadata = {
    evaluated_value: incomingValue,
    path_taken: matchedCase
      ? `Path: ${matchedCase.operator} ${matchedCase.compareValue}`
      : targetNodeId
        ? "Default Path"
        : "No Path Found",
    matched_node_id: targetNodeId,
    status: targetNodeId ? "routing" : "dead_end",
  };

  await prisma.node.update({
    where: { id: node.id },
    data: {
      result: { ...parentData, switch_metadata: executionMetadata },
      status: "success",
    },
  });

  nodeResults[label] = parentData;

  return nextIndex !== -1 ? [nextIndex] : [];
};
