import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies a password without storing it in plaintext", async () => {
    const hash = await hashPassword("co-op-pass-123");

    expect(hash).not.toContain("co-op-pass-123");
    expect(await verifyPassword("co-op-pass-123", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("rejects malformed hashes", async () => {
    await expect(verifyPassword("anything", "invalid")).resolves.toBe(false);
  });
});