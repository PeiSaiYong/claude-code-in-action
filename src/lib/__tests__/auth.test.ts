// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const set = vi.fn();
const get = vi.fn();
const del = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ set, get, delete: del })),
}));

import {
  createSession,
  getSession,
  deleteSession,
  verifySession,
} from "@/lib/auth";
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "development-secret-key"
);

async function signToken(
  claims: Record<string, unknown>,
  { expired = false }: { expired?: boolean } = {}
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expired ? "-1h" : "7d")
    .setIssuedAt()
    .sign(SECRET);
}

function requestWithToken(token?: string): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        name === "auth-token" && token ? { value: token } : undefined,
    },
  } as unknown as NextRequest;
}

beforeEach(() => {
  set.mockClear();
  get.mockReset();
  del.mockClear();
});

test("createSession sets the auth-token cookie", async () => {
  await createSession("user-123", "test@example.com");

  expect(set).toHaveBeenCalledTimes(1);
  const [name, token] = set.mock.calls[0];
  expect(name).toBe("auth-token");
  expect(typeof token).toBe("string");
  expect(token.length).toBeGreaterThan(0);
});

test("createSession signs a JWT containing the userId and email", async () => {
  await createSession("user-123", "test@example.com");

  const [, token] = set.mock.calls[0];
  const { payload } = await jwtVerify(token, SECRET);

  expect(payload.userId).toBe("user-123");
  expect(payload.email).toBe("test@example.com");
});

test("createSession sets secure cookie options", async () => {
  await createSession("user-123", "test@example.com");

  const [, , options] = set.mock.calls[0];
  expect(options.httpOnly).toBe(true);
  expect(options.sameSite).toBe("lax");
  expect(options.path).toBe("/");
  // NODE_ENV is "test" during the suite, so secure should be false
  expect(options.secure).toBe(false);
});

test("createSession expires the cookie roughly 7 days out", async () => {
  const before = Date.now();
  await createSession("user-123", "test@example.com");
  const after = Date.now();

  const [, , options] = set.mock.calls[0];
  expect(options.expires).toBeInstanceOf(Date);

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const expiresAt = (options.expires as Date).getTime();
  expect(expiresAt).toBeGreaterThanOrEqual(before + sevenDays - 1000);
  expect(expiresAt).toBeLessThanOrEqual(after + sevenDays + 1000);
});

test("createSession embeds an expiration claim in the token", async () => {
  await createSession("user-123", "test@example.com");

  const [, token] = set.mock.calls[0];
  const { payload } = await jwtVerify(token, SECRET);

  expect(payload.exp).toBeDefined();
  expect(payload.iat).toBeDefined();
  expect(payload.exp! - payload.iat!).toBe(7 * 24 * 60 * 60);
});

// --- getSession ---

test("getSession returns the payload for a valid token", async () => {
  const token = await signToken({ userId: "user-1", email: "a@b.com" });
  get.mockReturnValue({ value: token });

  const session = await getSession();

  expect(get).toHaveBeenCalledWith("auth-token");
  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-1");
  expect(session!.email).toBe("a@b.com");
});

test("getSession returns null when no cookie is present", async () => {
  get.mockReturnValue(undefined);

  expect(await getSession()).toBeNull();
});

test("getSession returns null when the cookie value is empty", async () => {
  get.mockReturnValue({ value: "" });

  expect(await getSession()).toBeNull();
});

test("getSession returns null for a malformed token", async () => {
  get.mockReturnValue({ value: "not-a-real-jwt" });

  expect(await getSession()).toBeNull();
});

test("getSession returns null for a token signed with the wrong secret", async () => {
  const token = await new SignJWT({ userId: "user-1", email: "a@b.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode("a-different-secret"));
  get.mockReturnValue({ value: token });

  expect(await getSession()).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const token = await signToken(
    { userId: "user-1", email: "a@b.com" },
    { expired: true }
  );
  get.mockReturnValue({ value: token });

  expect(await getSession()).toBeNull();
});

// --- deleteSession ---

test("deleteSession removes the auth-token cookie", async () => {
  await deleteSession();

  expect(del).toHaveBeenCalledTimes(1);
  expect(del).toHaveBeenCalledWith("auth-token");
});

// --- verifySession ---

test("verifySession returns the payload for a valid request token", async () => {
  const token = await signToken({ userId: "user-9", email: "c@d.com" });

  const session = await verifySession(requestWithToken(token));

  expect(session).not.toBeNull();
  expect(session!.userId).toBe("user-9");
  expect(session!.email).toBe("c@d.com");
});

test("verifySession returns null when the request has no token", async () => {
  expect(await verifySession(requestWithToken(undefined))).toBeNull();
});

test("verifySession returns null for a malformed token", async () => {
  expect(await verifySession(requestWithToken("garbage"))).toBeNull();
});

test("verifySession returns null for an expired token", async () => {
  const token = await signToken(
    { userId: "user-9", email: "c@d.com" },
    { expired: true }
  );

  expect(await verifySession(requestWithToken(token))).toBeNull();
});

test("verifySession does not depend on next/headers cookies", async () => {
  const token = await signToken({ userId: "user-9", email: "c@d.com" });

  await verifySession(requestWithToken(token));

  expect(get).not.toHaveBeenCalled();
});
