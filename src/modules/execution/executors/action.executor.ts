import {
  DiscordAction,
  GoogleSheetsAction,
  SlackAction,
  TelegramAction,
} from "../../../services/action.service.js";
import { getNodeLabel } from "../../../services/label.service.js";
import { resolveVariables } from "../../../services/resolver.service.js";
import { updateNodeState } from "../execution.service.js";
import {
  ProviderEnum,
  type ActionConfig,
  type ExecutableNode,
  type ExecutionContext,
} from "../types.js";

export const executeActionNode = async (
  node: ExecutableNode,
  context: ExecutionContext,
): Promise<number[]> => {
  const { conn_id, nodeResults } = context;
  const config = node.config as unknown as ActionConfig;
  let imd_result = {};

  try {
    if (!config || !config.body) {
      return [];
    }

    const hydratedBody = resolveVariables(config.body, nodeResults);

    if (config.provider === ProviderEnum.Telegram) {
      const telegramResponse = await TelegramAction(hydratedBody, conn_id);

      if (!telegramResponse.ok) {
        throw new Error(
          telegramResponse.description || "An unknown error occurred",
        );
      }
      imd_result = {
        success: telegramResponse.ok,
        messageId: telegramResponse.result?.message_id,
        chatId: telegramResponse.result?.chat?.id,
        recipient:
          telegramResponse.result?.chat?.username ||
          telegramResponse.result?.chat?.first_name,
        sentAt: new Date().toISOString(),
        sentText: hydratedBody.message,
      };
    } else if (config.provider === ProviderEnum.Slack) {
      const slackResponse = await SlackAction(hydratedBody, conn_id);
      imd_result = {
        success: slackResponse.ok,
        sentAt: new Date().toISOString(),
        sentText: String(slackResponse.message.text),
        type: slackResponse.message.type,
        bot: slackResponse.message.bot_profile.name,
      };
    } else if (config.provider === ProviderEnum.Discord) {
      const discordResponse = await DiscordAction(hydratedBody);
      imd_result = {
        success: true,
        sentAt: discordResponse.timestamp,
        sentText: String(discordResponse.content),
        author: discordResponse.author.username,
      };
    } else if (config.provider === ProviderEnum.GoogleSheets) {
      const GoogleSheetsResponse = await GoogleSheetsAction(
        hydratedBody,
        conn_id,
      );
      imd_result = {
        success: true,
        spreadsheetId: GoogleSheetsResponse.spreadsheetId,
        updatedRange: GoogleSheetsResponse.updates?.updatedRange,
        updatedRows: GoogleSheetsResponse.updates?.updatedRows,
        updatedCells: GoogleSheetsResponse.updates?.updatedCells,
        sentAt: new Date().toISOString(),
      };
    }

    await updateNodeState(node.id, "success", imd_result, null);

    const label = getNodeLabel(node);
    nodeResults[label] = imd_result;
    return node.outgoing;
  } catch (error: any) {
    await updateNodeState(node.id, "failed", undefined, error.message);
    return [];
  }
};
