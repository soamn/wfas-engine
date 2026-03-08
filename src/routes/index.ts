import { Router, type Request, type Response } from "express";
import {
  executeWorkflow,
  syncWorkflow,
} from "../modules/workflow/workflow.service.js";

const router: Router = Router();

router.post("/workflow", executeWorkflow);
router.post("/workflow/sync", syncWorkflow);
export default router;
