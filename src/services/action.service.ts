import config from "../config/config.js";
import { prisma } from "../lib/prisma.js";
import { ProviderEnum, type ActionBody } from "../modules/execution/types.js";

export const getCredential = async (
  provider: ProviderEnum,
  conn_id: number,
) => {
  const response = await fetch(`${config.BACKEND_URL}/api/credential/provide`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-engine-secret": config.ENGINE_INTERNAL_SECRET,
    },
    body: JSON.stringify({ provider: provider, conn_id }),
  });
  return response;
};

export const TelegramAction = async (
  actionConfig: ActionBody,
  conn_id: number,
) => {
  const response = await getCredential(ProviderEnum.Telegram, conn_id);
  const result = await response.json();

  const creds = result.response;
  if (!creds?.credential?.chat_id) {
    return {
      ok: false,
      description: "Please message the bot and type /setup first.",
    };
  }
  const token = creds.credential.key;

  const telegramRes = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: creds.credential.chat_id,
        text: actionConfig.message,
      }),
    },
  );

  return await telegramRes.json();
};

export const SlackAction = async (
  actionConfig: ActionBody,
  conn_id: number,
) => {
  const response = await getCredential(ProviderEnum.Slack, conn_id);
  const result = await response.json();
  const creds = result.response;
  const token = creds.credential.key;
  const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      channel: actionConfig.channel,
      text: actionConfig.message,
    }),
  });

  return await slackRes.json();
};

export const DiscordAction = async (actionConfig: ActionBody) => {
  const discordRes = await fetch(
    `https://discord.com/api/v10/channels/${actionConfig.channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${config.DISCORD_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: actionConfig.message,
      }),
    },
  );

  return await discordRes.json();
};

export const GoogleSheetsAction = async (
  actionConfig: ActionBody,
  conn_id: number,
) => {
  const response = await getCredential(ProviderEnum.GoogleSheets, conn_id);
  const result = await response.json();
  const creds = result.response.credential;

  let accessToken = creds.access_token;

  const isExpired = Date.now() >= creds.expires_at - 300000;

  if (isExpired && creds.refresh_token) {
    console.log("Refreshing Google Token...");
    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: JSON.stringify({
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        refresh_token: creds.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    const refreshData = await refreshResponse.json();
    if (refreshData.access_token) {
      accessToken = refreshData.access_token;

      await prisma.credential.update({
        where: { name: ProviderEnum.GoogleSheets, userId: conn_id },
        data: {
          credential: {
            ...creds,
            access_token: accessToken,
            expires_at: Date.now() + refreshData.expires_in * 1000,
          },
        },
      });
    }
  }

  const rowValues = Object.values(actionConfig.message);
  const range = `${actionConfig.sheetName}!A1`;
  const sheetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${actionConfig.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const appendRes = await fetch(sheetUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  const appendResult = await appendRes.json();

  return appendResult;
};
