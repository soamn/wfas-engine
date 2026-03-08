import type { WorkflowState } from "@prisma/client";
import { NodeType } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { getNodeLabel } from "../../services/label.service.js";
import { executeActionNode } from "./executors/action.executor.js";
import { executeChatNode } from "./executors/chat.executor.js";
import { executeConditionNode } from "./executors/condition.executor.js";
import { executeDelayNode } from "./executors/delay.executor.js";
import { executeExtractNode } from "./executors/extract.executor.js";
import { executeFailNode } from "./executors/fail.executor.js";
import { executeFilterNode } from "./executors/filter.executor.js";
import { executeLoopNode } from "./executors/loop.executor.js";
import { executeManualAPI } from "./executors/manual-api.executor.js";
import { executeSetNode } from "./executors/set.executor.js";
import { executeSwitchNode } from "./executors/switch.executor.js";
import { executeTransformNode } from "./executors/transform.executor.js";
import { executeTriggerNode } from "./executors/trigger.executor.js";
import { executeWebhookNode } from "./executors/webhook.executor.js";
import type { ExecutableNode, ExecutionContext } from "./types.js";

const getWorkflow = async (workflowId: string) => {
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId },
    include: {
      Node: true,
      Connection: true,
    },
  });

  if (!workflow) return null;
  const nodeIdToIndex = new Map(workflow.Node.map((n) => [n.id, n.index]));
  const formattedNodes = workflow.Node.map((node) => {
    const outgoingIndices = workflow.Connection.filter(
      (conn) => conn.sourceNodeId === node.id,
    )
      .map((conn) => nodeIdToIndex.get(conn.targetNodeId))
      .filter((index): index is number => index !== undefined);

    return {
      ...node,
      outgoing: outgoingIndices,
    };
  });

  return {
    id: workflow.id,
    state: workflow.state,
    nodes: formattedNodes,
  };
};
export const runWorkflow = async (workflowId: string, conn_id: number) => {
  let workflow = await getWorkflow(workflowId);
  if (!workflow) return;

  const nodes = workflow.nodes as ExecutableNode[];
  let nodeResults: Record<string, any> | null = {};
  const triggerIndex = nodes.findIndex(
    (n) => n.type === NodeType.TRIGGER || n.type === NodeType.WEBHOOK,
  );

  if (triggerIndex === -1) {
    throw new Error("No trigger node found");
  }

  const executionLog = await prisma.executionLog.create({
    data: {
      workflowId: workflow.id,
      startedAt: new Date(),
      status: "Running",
    },
  });

  let context: ExecutionContext | null = {
    conn_id,
    nodeResults,
    allNodes: nodes,
    workflowId: workflow.id,
  };

  try {
    await runNodeAtIndex(triggerIndex, context);

    const hasScheduledTrigger = nodes.some(
      (node) =>
        node.type === NodeType.TRIGGER &&
        (node.config as any)?.triggerType === "schedule" &&
        (node.config as any)?.cronExpression,
    );

    let finalWorkflowState: WorkflowState = "Completed";
    if (hasScheduledTrigger) {
      const latestWorkflowState = await prisma.workflow.findUnique({
        where: { id: workflow.id },
        select: { state: true },
      });
      if (latestWorkflowState?.state === "Scheduled") {
        finalWorkflowState = "Scheduled";
      }
    }

    await prisma.workflow.update({
      where: { id: workflow.id },
      data: { state: finalWorkflowState },
    });

    await prisma.executionLog.update({
      where: { id: executionLog.id },
      data: {
        endTime: new Date(),
        status: "Completed",
        resultData: nodeResults,
      },
    });
  } catch (error: any) {
    await prisma.executionLog.update({
      where: { id: executionLog.id },
      data: {
        endTime: new Date(),
        status: "Failed",
        error: { message: error.message, stack: error.stack },
        resultData: nodeResults,
      },
    });

    throw error;
  } finally {
    nodeResults = null;
    context = null;
    workflow = null;
  }
};

const runNodeAtIndex = async (
  index: number,
  context: ExecutionContext,
  parentLabel?: string,
) => {
  const node = context.allNodes[index];
  if (!node) return;

  const nextIndices = await executeNode(node, context, parentLabel);
  const currentLabel = getNodeLabel(node);

  if (nextIndices && nextIndices.length > 0) {
    await Promise.all(
      nextIndices.map((nextIdx) =>
        runNodeAtIndex(nextIdx, context, currentLabel),
      ),
    );
  }
};

export const executeNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
  parentLabel?: string,
): Promise<number[] | void> => {
  switch (node.type) {
    case NodeType.TRIGGER:
      return await executeTriggerNode(node, context);
    case NodeType.MANUAL_API:
      return await executeManualAPI(node, context);
    case NodeType.WEBHOOK:
      return await executeWebhookNode(node);
    case NodeType.ACTION:
      return await executeActionNode(node, context);
    case NodeType.SET:
      return await executeSetNode(node, context, parentLabel);
    case NodeType.FILTER:
      return await executeFilterNode(node, context, parentLabel);
    case NodeType.DELAY:
      return await executeDelayNode(node, context, parentLabel);
    case NodeType.TRANSFORM:
      return await executeTransformNode(node, context, parentLabel);
    case NodeType.EXTRACT:
      return await executeExtractNode(node, context);
    case NodeType.CONDITION:
      return await executeConditionNode(node, context, parentLabel);
    case NodeType.SWITCH:
      return await executeSwitchNode(node, context, parentLabel);
    case NodeType.LOOP:
      return await executeLoopNode(node, context, executeNode);
    case NodeType.FAIL:
      return await executeFailNode(node, context);
    case NodeType.CHAT:
      return await executeChatNode(node, context);
    default:
      return node.outgoing;
  }
};
