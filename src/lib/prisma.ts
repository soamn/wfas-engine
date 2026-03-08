import "dotenv/config";
import pg from "pg"; // Explicitly import pg
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;

const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
