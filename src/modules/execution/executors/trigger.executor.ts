import cron from "node-cron";
import { getNodeLabel } from "../../../services/label.service.js";
import { prisma } from "../../../lib/prisma.js";
import { runWorkflow } from "../engine.js";
import { WorkflowState } from "@prisma/client";
import type {
  ExecutableNode,
  ExecutionContext,
  TriggerConfig,
} from "../types.js";
import { cronManager } from "../../../lib/cron-manager.js";

export const executeTriggerNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
) => {
  const { nodeResults, conn_id, workflowId } = context;
  const config = node.config as unknown as TriggerConfig;
  const label = getNodeLabel(node);

  nodeResults[label] = node.result;

  if (config.triggerType === "schedule" && config.cronExpression) {
    if (cronManager.isJobRunning(workflowId)) {
      return node.outgoing;
    }

    const task = cron.schedule(config.cronExpression, async () => {
      const latestWorkflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: { Node: true },
      });

      if (!latestWorkflow || latestWorkflow.state === WorkflowState.Draft) {
        await cronManager.stopJob(workflowId);
        return;
      }

      const workflowForExecution = {
        ...latestWorkflow,
        nodes: latestWorkflow.Node,
      };

      if (workflowForExecution.nodes?.length > 0) {
        await runWorkflow(workflowForExecution.id, conn_id);
      }
    });

    cronManager.setJob(workflowId, task);

    await prisma.workflow.update({
      where: { id: workflowId },
      data: { state: WorkflowState.Scheduled },
    });

    return [];
  }

  return node.outgoing;
};
