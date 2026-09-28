import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("marketplace procedures", () => {
  const caller = appRouter.createCaller({
    user: null,
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });

  it("returns service categories for discovery", async () => {
    const categories = await caller.marketplace.categories();
    expect(categories.length).toBeGreaterThanOrEqual(4);
    expect(categories.some((category) => category.name === "Electrical")).toBe(true);
  });

  it("returns nearby workers with ratings and availability", async () => {
    const workers = await caller.marketplace.workers({});
    expect(workers.length).toBeGreaterThanOrEqual(3);
    expect(workers[0]).toHaveProperty("displayName");
    expect(workers[0]).toHaveProperty("rating");
    expect(workers[0]).toHaveProperty("available");
  });

  it("returns cooperative analytics for the dashboard", async () => {
    const analytics = await caller.marketplace.analytics();
    expect(analytics.activeWorkers).toEqual(expect.any(Number));
    expect(analytics.monthlyVolume).toEqual(expect.any(Number));
    expect(analytics.satisfaction).toBeGreaterThan(0);
  });
});
