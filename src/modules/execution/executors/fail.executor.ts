import { prisma } from "../../../lib/prisma.js";
import type { ExecutableNode, ExecutionContext, FailConfig } from "../types.js";

export const executeFailNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
) => {
  const config = node.config as unknown as FailConfig;

  await prisma.node.update({
    where: { id: node.id },
    data: {
      result: {
        error: true,
        message: config.errorMessage || "Workflow terminated by Fail Node",
      },
      status: "failed",
    },
  });
  return [];
};
