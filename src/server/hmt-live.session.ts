import type { HmtOAuthTransaction } from "../types/hmt-live";

export function createHmtSession(options: {
  cookies: () => Promise<CookieStore>;
  secureCookies: boolean;
}) {
  const cookies = options.cookies;
  const env = {
    NODE_ENV: options.secureCookies ? "production" : "development",
  };
  const HMT_ACCESS_TOKEN_COOKIE = "hmt_live_access_token";
  const HMT_OAUTH_STATE_COOKIE = "hmt_oauth_state";
  const HMT_OAUTH_CODE_VERIFIER_COOKIE = "hmt_oauth_code_verifier";
  const HMT_OAUTH_RETURN_PATH_COOKIE = "hmt_oauth_return_path";
  const HMT_OAUTH_LOCALE_COOKIE = "hmt_oauth_locale";
  const HMT_OAUTH_TRANSACTION_MAX_AGE_SECONDS = 10 * 60;
  const baseCookieOptions = () => ({
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
  });
  const normalizeReturnPath = (value?: string | null): string => {
    const path = value?.trim();
    if (!path || !path.startsWith("/") || path.startsWith("//")) {
      return "/";
    }

    return path;
  };
  const getHmtAccessToken = async (): Promise<string | null> => {
    const cookieStore = await cookies();
    return cookieStore.get(HMT_ACCESS_TOKEN_COOKIE)?.value ?? null;
  };
  const hmtAccessTokenCookieOptions = (expiresInSeconds: number) => {
    if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
      throw new Error("HMT access token expiration must be positive.");
    }

    return {
      ...baseCookieOptions(),
      expires: new Date(Date.now() + expiresInSeconds * 1000),
    };
  };
  const setHmtAccessToken = async (
    accessToken: string,
    expiresInSeconds: number,
  ): Promise<void> => {
    const token = accessToken.trim();
    if (!token) {
      throw new Error("HMT access token cannot be empty.");
    }

    const cookieStore = await cookies();
    cookieStore.set(
      HMT_ACCESS_TOKEN_COOKIE,
      token,
      hmtAccessTokenCookieOptions(expiresInSeconds),
    );
  };
  const clearHmtAccessToken = async (): Promise<void> => {
    const cookieStore = await cookies();
    cookieStore.delete(HMT_ACCESS_TOKEN_COOKIE);
  };
  const setHmtOAuthTransaction = async ({
    state,
    codeVerifier,
    locale,
    returnPath,
  }: HmtOAuthTransaction): Promise<void> => {
    const cookieStore = await cookies();
    const options = {
      ...baseCookieOptions(),
      maxAge: HMT_OAUTH_TRANSACTION_MAX_AGE_SECONDS,
    };

    cookieStore.set(HMT_OAUTH_STATE_COOKIE, state, options);
    cookieStore.set(HMT_OAUTH_CODE_VERIFIER_COOKIE, codeVerifier, options);
    cookieStore.set(
      HMT_OAUTH_RETURN_PATH_COOKIE,
      normalizeReturnPath(returnPath),
      options,
    );
    cookieStore.set(
      HMT_OAUTH_LOCALE_COOKIE,
      locale === "en" ? "en" : "pt",
      options,
    );
  };
  const getHmtOAuthTransaction =
    async (): Promise<HmtOAuthTransaction | null> => {
      const cookieStore = await cookies();
      const state = cookieStore.get(HMT_OAUTH_STATE_COOKIE)?.value;
      const codeVerifier = cookieStore.get(
        HMT_OAUTH_CODE_VERIFIER_COOKIE,
      )?.value;

      if (!state || !codeVerifier) {
        return null;
      }

      return {
        state,
        codeVerifier,
        locale:
          cookieStore.get(HMT_OAUTH_LOCALE_COOKIE)?.value === "en"
            ? "en"
            : "pt",
        returnPath: normalizeReturnPath(
          cookieStore.get(HMT_OAUTH_RETURN_PATH_COOKIE)?.value,
        ),
      };
    };
  const clearHmtOAuthTransaction = async (): Promise<void> => {
    const cookieStore = await cookies();
    cookieStore.delete(HMT_OAUTH_STATE_COOKIE);
    cookieStore.delete(HMT_OAUTH_CODE_VERIFIER_COOKIE);
    cookieStore.delete(HMT_OAUTH_RETURN_PATH_COOKIE);
    cookieStore.delete(HMT_OAUTH_LOCALE_COOKIE);
  };
  const clearHmtSession = async (): Promise<void> => {
    await clearHmtAccessToken();
    await clearHmtOAuthTransaction();
  };
  return {
    HMT_ACCESS_TOKEN_COOKIE,
    getHmtAccessToken,
    hmtAccessTokenCookieOptions,
    setHmtAccessToken,
    clearHmtAccessToken,
    setHmtOAuthTransaction,
    getHmtOAuthTransaction,
    clearHmtOAuthTransaction,
    clearHmtSession,
  };
}

export type CookieStore = {
  get: (name: string) => { value: string } | undefined;
  set: (
    name: string,
    value: string,
    options?: {
      httpOnly?: boolean;
      path?: string;
      sameSite?: "lax";
      secure?: boolean;
      maxAge?: number;
      expires?: Date;
    },
  ) => void;
  delete: (name: string) => void;
};
