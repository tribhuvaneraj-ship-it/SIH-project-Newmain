import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { hashPassword, verifyPassword } from "./_core/password";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import type { TrpcContext } from "./_core/context";
import * as db from "./mongoDb";
import { ENV } from "./_core/env";
import {
  acceptRequest,
  changeRequestStatus,
  createRequest,
  getCooperativeAnalytics,
  getRequestTracking,
  getWorkerStats,
  listCategories,
  listRequestsForUser,
  listWorkers,
  startRequest,
  updateAvailability,
  updateWorkerLocation,
} from "./mongoDb";

const userTypeSchema = z.enum(["customer", "worker", "cooperative"]);
const emailSchema = z.string().trim().email().max(320);
const passwordSchema = z.string().min(8).max(128);
const workerLocationSchema = z.object({
  id: z.number().int().positive(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100_000),
});

async function createLoginSession(ctx: TrpcContext, user: { openId: string; name: string | null }) {
  const token = await sdk.createSessionToken(user.openId, {
    name: user.name ?? "",
    expiresInMs: ONE_YEAR_MS,
  });
  ctx.res.cookie(COOKIE_NAME, token, {
    ...getSessionCookieOptions(ctx.req),
    sameSite: "lax",
    maxAge: ONE_YEAR_MS,
  });
}

function requireMongoConfiguration() {
  if (!ENV.mongoUri) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Sign-in is not configured yet. Set MONGODB_URI in your local .env and restart the server.",
    });
  }
}

function requireWorker(userType: string) {
  if (userType !== "worker") {
    throw new TRPCError({ code: "FORBIDDEN", message: "A worker account is required for this action" });
  }
}

async function runWorkerAction<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof Error) {
      throw new TRPCError({ code: "CONFLICT", message: error.message });
    }
    throw error;
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    register: publicProcedure
      .input(z.object({
        name: z.string().trim().min(2).max(120),
        email: emailSchema,
        password: passwordSchema,
        userType: z.enum(["customer", "worker"]).default("customer"),
        workerCategory: z.string().trim().min(2).max(120).optional(),
        neighborhood: z.string().trim().min(2).max(120).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        requireMongoConfiguration();
        const email = input.email.toLowerCase();
        const passwordHash = await hashPassword(input.password);
        let user;
        try {
          user = await db.createLocalAccount({
            name: input.name,
            email,
            passwordHash,
            userType: input.userType,
            workerCategory: input.workerCategory,
            neighborhood: input.neighborhood,
          });
        } catch (error) {
          const errorCode = (error as { code?: string | number })?.code;
          if (errorCode === "ER_DUP_ENTRY" || errorCode === 11000) {
            throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists" });
          }
          throw error;
        }
        await createLoginSession(ctx, user);
        return user;
      }),
    login: publicProcedure
      .input(z.object({ email: emailSchema, password: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        requireMongoConfiguration();
        const email = input.email.toLowerCase();
        const credential = await db.getLocalCredentialByEmail(email);
        const validPassword = credential && await verifyPassword(input.password, credential.passwordHash);
        if (!credential || !validPassword) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect" });
        }

        const user = await db.getUserById(credential.userId);
        if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect" });
        await db.upsertUser({ openId: user.openId, lastSignedIn: new Date() });
        await createLoginSession(ctx, user);
        return user;
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, sameSite: "lax" });
      return { success: true } as const;
    }),
  }),
  marketplace: router({
    categories: publicProcedure.query(() => listCategories()),
    workers: publicProcedure
      .input(z.object({ category: z.string().optional() }).optional())
      .query(({ input }) => listWorkers(input?.category)),
    analytics: publicProcedure.query(() => getCooperativeAnalytics()),
  }),
  dashboard: router({
    requests: protectedProcedure.query(({ ctx }) => {
      const userType = (((ctx.user as any).userType ?? "customer") as z.infer<typeof userTypeSchema>);
      return listRequestsForUser(ctx.user.id, userType);
    }),
    workerStats: protectedProcedure.query(({ ctx }) => getWorkerStats(ctx.user.id)),
  }),
  requests: router({
    create: protectedProcedure
      .input(z.object({
        serviceName: z.string().min(2),
        description: z.string().min(8),
        address: z.string().min(3),
        preferredDate: z.string().min(2),
        preferredTime: z.string().min(2),
        budget: z.number().int().positive().optional(),
        categoryId: z.number().int().positive().optional(),
      }))
      .mutation(({ ctx, input }) => createRequest({ ...input, customerId: ctx.user.id })),
    accept: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => {
        requireWorker(ctx.user.userType);
        requireMongoConfiguration();
        return runWorkerAction(() => acceptRequest(input.id, ctx.user.id));
      }),
    track: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(({ ctx, input }) => {
        requireMongoConfiguration();
        return getRequestTracking(input.id, ctx.user.id);
      }),
    updateStatus: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), status: z.enum(["accepted", "in_progress", "completed", "cancelled"]) }))
      .mutation(async ({ ctx, input }) => {
        requireWorker(ctx.user.userType);
        if (input.status === "accepted") {
          await acceptRequest(input.id, ctx.user.id);
          return { id: input.id, status: "accepted" as const };
        }
        if (input.status === "in_progress") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Starting a job requires sharing your current location" });
        }
        requireMongoConfiguration();
        return runWorkerAction(() => changeRequestStatus(input.id, input.status as "completed" | "cancelled", ctx.user.id));
      }),
  }),
  workers: router({
    startJob: protectedProcedure
      .input(workerLocationSchema)
      .mutation(({ ctx, input }) => {
        requireWorker(ctx.user.userType);
        requireMongoConfiguration();
        return runWorkerAction(() => startRequest(input.id, ctx.user.id, {
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
        }));
      }),
    updateLocation: protectedProcedure
      .input(workerLocationSchema)
      .mutation(({ ctx, input }) => {
        requireWorker(ctx.user.userType);
        requireMongoConfiguration();
        return runWorkerAction(() => updateWorkerLocation(input.id, ctx.user.id, {
          latitude: input.latitude,
          longitude: input.longitude,
          accuracy: input.accuracy,
        }));
      }),
    setAvailability: protectedProcedure
      .input(z.object({ available: z.boolean() }))
      .mutation(({ ctx, input }) => {
        requireWorker(ctx.user.userType);
        requireMongoConfiguration();
        return runWorkerAction(() => updateAvailability(ctx.user.id, input.available));
      }),
  }),
});

export type AppRouter = typeof appRouter;
