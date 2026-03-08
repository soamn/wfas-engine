import type { Node } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

export const updateNodeState = async (
  nodeId: string,
  status: Node["status"],
  result: any,
  error: string | null,
) => {
  return await prisma.node.update({
    where: { id: nodeId },
    data: {
      status,
      result,
      error,
    },
  });
};
