import type { ScheduledTask } from "node-cron";
import { prisma } from "./prisma.js";

const activeJobs = new Map<string, ScheduledTask>();

export const cronManager = {
  stopJob: async (workflowId: string) => {
    await prisma.workflow.update({
      where: { id: workflowId },
      data: { state: "Draft" },
    });
    const job = activeJobs.get(workflowId);
    if (job) {
      job.stop();
      activeJobs.delete(workflowId);
    }
  },
  setJob: (workflowId: string, task: ScheduledTask) => {
    activeJobs.set(workflowId, task);
  },
  isJobRunning: (workflowId: string) => activeJobs.has(workflowId),
};
