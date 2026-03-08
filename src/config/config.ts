import dotenv from "dotenv";

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  ENGINE_INTERNAL_SECRET: string;
  BACKEND_URL: string;
  DISCORD_TOKEN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}

const config: Config = {
  port: Number(process.env.PORT) || 8008,
  nodeEnv: process.env.NODE_ENV || "development",
  ENGINE_INTERNAL_SECRET: process.env.ENGINE_INTERNAL_SECRET!,
  BACKEND_URL: process.env.BACKEND_URL!,
  DISCORD_TOKEN: process.env.DISCORD_TOKEN!,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
};

export default config;
