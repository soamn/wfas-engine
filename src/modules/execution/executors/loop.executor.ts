import { getNodeLabel } from "../../../services/label.service.js";
import { resolveVariables } from "../../../services/resolver.service.js";
import { updateNodeState } from "../execution.service.js";
import type { ExecutableNode, ExecutionContext, LoopConfig } from "../types.js";

export const executeLoopNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
  executeNodeFn: (
    node: ExecutableNode,
    context: ExecutionContext,
    parentLabel?: string
  ) => Promise<number[] | void>
): Promise<number[]> => {
  const { nodeResults, allNodes } = context;
  const config = node.config as unknown as LoopConfig;
  const label = getNodeLabel(node);

  try {
    const sourceArray = resolveVariables(config.loopOver, nodeResults);

    if (!Array.isArray(sourceArray)) {
      throw new Error(`Expected array, got ${typeof sourceArray}`);
    }

    const iterateNode = allNodes.find((n) => n.id === config.iterateNodeId);
    const nextIdx = allNodes.findIndex((n) => n.id === config.nextNodeId);

    const loopOutput: any[] = [];
    const iteratorLabel = iterateNode ? getNodeLabel(iterateNode) : "";
    const limit = Math.min(sourceArray.length, config.maxIterations || 100);

    for (let i = 0; i < limit; i++) {
      const currentItem = sourceArray[i];

      nodeResults["loop_item"] = currentItem;
      nodeResults["loop_index"] = i;

      nodeResults[label] =
        typeof currentItem === "object" && currentItem !== null
          ? currentItem
          : { value: currentItem };

      if (iterateNode) {
        await executeNodeFn(iterateNode, context, label);

        const transformedValue = nodeResults[iteratorLabel];

        loopOutput.push({
          iteration: i,
          original_value: currentItem,
          result_value: transformedValue,
        });
      }
    }

    const finalResult = {
      total_processed: loopOutput.length,
      iterations: loopOutput,
    };

    await updateNodeState(node.id, "success", finalResult,null);

    nodeResults[label] = finalResult;

    return nextIdx !== -1 ? [nextIdx] : [];
  } catch (error: any) {
    await updateNodeState(node.id, "failed", undefined, error.message);
    return [];
  }
};

