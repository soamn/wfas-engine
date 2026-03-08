import type { Request, Response } from "express";
import { runWorkflow } from "../execution/engine.js";
import { cronManager } from "../../lib/cron-manager.js";

export const executeWorkflow = async (req: Request, res: Response) => {
  const { workflowId, conn_id } = req.body;
  try {
    await runWorkflow(workflowId, conn_id);
    res.status(200).json({ message: "Workflow completed" });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: error.message || "Workflow execution failed" });
  }
};

export const syncWorkflow = async (req: Request, res: Response) => {
  const { workflowId, action } = req.body;

  try {
    if (action === "STOP" || action === "REFRESH") {
      cronManager.stopJob(workflowId);
      return res.status(200).json({
        message: `Cron job ${action === "STOP" ? "stopped" : "cleared for refresh"} successfully`,
      });
    }
    res.status(400).json({ error: "Invalid sync action" });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Sync failed" });
  }
};
