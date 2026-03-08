import { prisma } from "../../../lib/prisma.js";
import { getNodeLabel } from "../../../services/label.service.js";
import type {  DelayConfig, ExecutableNode, ExecutionContext } from "../types.js";

export const executeDelayNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
  parentLabel?: string,
) => {
  const { nodeResults } = context;
  const config = node.config as unknown as DelayConfig;
  const label = getNodeLabel(node);

  const totalMs =
    (config.hours || 0) * 3600000 +
    (config.minutes || 0) * 60000 +
    (config.seconds || 0) * 1000 +
    (config.milliseconds || 0);

  const delayed_For = `${config.hours}h ${config.minutes}m ${config.seconds}s ${config.milliseconds}ms`;
  const parentData = parentLabel ? nodeResults[parentLabel] || {} : {};

  await prisma.node.update({
    where: { id: node.id },
    data: {
      status: "pending",
      result: { ...parentData, delayed_For, status: "Waiting..." },
    },
  });

  await new Promise((resolve) => setTimeout(resolve, totalMs));

  const finalResult = {
    ...parentData,
    delayed_For: delayed_For,
  };

  await prisma.node.update({
    where: { id: node.id },
    data: {
      result: finalResult,
      status: "success",
    },
  });

  nodeResults[label] = finalResult;

  return node.outgoing;
};
