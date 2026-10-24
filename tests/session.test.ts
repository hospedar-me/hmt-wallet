import { it, expect, vi } from "vitest";
import {
  createHmtSession,
  createHmtConfig,
  createHmtAuth,
} from "../src/server";
function store() {
  const values = new Map<string, string>();
  const options: unknown[] = [];
  return {
    values,
    options,
    cookies: async () => ({
      get: (key: string) =>
        values.has(key) ? { value: values.get(key)! } : undefined,
      set: (key: string, value: string, opts: unknown) => {
        values.set(key, value);
        options.push(opts);
      },
      delete: (key: string) => {
        values.delete(key);
      },
    }),
  };
}
it("keeps OAuth state, PKCE verifier and access token in HTTP-only server cookies", async () => {
  const jar = store();
  const session = createHmtSession({
    cookies: jar.cookies,
    secureCookies: true,
  });
  await session.setHmtOAuthTransaction({
    state: "state",
    codeVerifier: "verifier",
    locale: "en",
    returnPath: "//outside.test",
  });
  expect(await session.getHmtOAuthTransaction()).toMatchObject({
    returnPath: "/",
    state: "state",
    codeVerifier: "verifier",
  });
  await session.setHmtAccessToken("secret", 300);
  expect(
    jar.options.every(
      (o: any) => o.httpOnly && o.secure && o.sameSite === "lax",
    ),
  ).toBe(true);
  await session.clearHmtSession();
  expect(await session.getHmtAccessToken()).toBeNull();
  expect(await session.getHmtOAuthTransaction()).toBeNull();
});
it("rejects an invalid OAuth state before issuing a token request", async () => {
  const jar = store();
  const session = createHmtSession({
    cookies: jar.cookies,
    secureCookies: true,
  });
  await session.setHmtOAuthTransaction({
    state: "expected",
    codeVerifier: "verifier",
    locale: "en",
    returnPath: "/",
  });
  const auth = createHmtAuth({ config: createHmtConfig({}), session });
  const request = vi.spyOn(globalThis, "fetch");
  await expect(
    auth.exchangeHmtOAuthAuthorizationCode({ code: "code", state: "wrong" }),
  ).rejects.toThrow();
  expect(request).not.toHaveBeenCalled();
  request.mockRestore();
});
