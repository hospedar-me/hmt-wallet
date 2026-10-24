import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type {
  HmtCreateOAuthAuthorizationRequest,
  HmtOAuthAuthorizationResponse,
  HmtOAuthAuthorizationServerMetadata,
  HmtOAuthTokenResponse,
} from "../types/hmt-live";
export class HmtOAuthError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "HmtOAuthError";
    this.status = status;
  }
}
export type HmtOAuthStart = {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
};
export function createHmtAuth(options: {
  config: ReturnType<typeof createHmtConfig>;
  session: ReturnType<typeof createHmtSession>;
  logger?: Pick<Console, "error" | "warn" | "info">;
}) {
  const {
    HMT_OAUTH_CLIENT_ID,
    HMT_OAUTH_CODE_CHALLENGE_METHOD,
    getHmtLiveBaseUrl,
    getHmtAuthBaseUrl,
    getHmtAuthUiBaseUrl,
    getHmtOAuthRedirectUri,
    isHmtWalletAvailable,
  } = options.config;
  const {
    clearHmtOAuthTransaction,
    getHmtOAuthTransaction,
    setHmtOAuthTransaction,
  } = options.session;
  const logger = options.logger || console;
  const OAUTH_METADATA_PATH = "/.well-known/openid-configuration";
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === "object";
  const isStringArray = (value: unknown): value is string[] =>
    Array.isArray(value) && value.every((item) => typeof item === "string");
  const isOAuthMetadata = (
    value: unknown,
  ): value is HmtOAuthAuthorizationServerMetadata => {
    if (!isRecord(value)) return false;

    return (
      typeof value.issuer === "string" &&
      typeof value.authorization_endpoint === "string" &&
      typeof value.token_endpoint === "string" &&
      typeof value.jwks_uri === "string" &&
      isStringArray(value.response_types_supported) &&
      isStringArray(value.grant_types_supported) &&
      isStringArray(value.code_challenge_methods_supported) &&
      isStringArray(value.token_endpoint_auth_methods_supported)
    );
  };
  const isAuthorizationResponse = (
    value: unknown,
  ): value is HmtOAuthAuthorizationResponse => {
    if (!isRecord(value)) return false;
    return (
      typeof value.redirectUrl === "string" &&
      typeof value.expiresAt === "string"
    );
  };
  const isTokenResponse = (value: unknown): value is HmtOAuthTokenResponse => {
    if (!isRecord(value)) return false;
    return (
      typeof value.access_token === "string" &&
      typeof value.token_type === "string" &&
      typeof value.expires_in === "number"
    );
  };
  const readJson = async (response: Response): Promise<unknown> => {
    const text = await response.text();
    if (!text) return undefined;

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return undefined;
    }
  };
  const resolveOAuthBackchannelUrl = (endpoint: string): string => {
    const advertised = new URL(endpoint);
    const internalBase = new URL(`${getHmtAuthBaseUrl()}/`);

    advertised.protocol = internalBase.protocol;
    advertised.hostname = internalBase.hostname;
    advertised.port = internalBase.port;

    return advertised.toString();
  };
  const sanitizeReturnPath = (value: string): string => {
    const candidate = value.trim();
    if (!candidate.startsWith("/") || candidate.startsWith("//")) return "/";

    try {
      const url = new URL(candidate, "https://booking-engine.local");
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return "/";
    }
  };
  const getHmtOAuthMetadata =
    async (): Promise<HmtOAuthAuthorizationServerMetadata> => {
      const response = await fetch(
        `${getHmtAuthBaseUrl()}${OAUTH_METADATA_PATH}`,
        {
          headers: { Accept: "application/json" },
          cache: "no-store",
        },
      );
      const payload = await readJson(response);

      if (!response.ok) {
        throw new HmtOAuthError(
          `HMT OAuth metadata request failed with status ${response.status}.`,
          response.status,
        );
      }

      if (!isOAuthMetadata(payload)) {
        throw new HmtOAuthError("HMT OAuth metadata response is invalid.");
      }

      if (
        !payload.response_types_supported.includes("code") ||
        !payload.grant_types_supported.includes("authorization_code") ||
        !payload.code_challenge_methods_supported.includes("S256") ||
        !payload.token_endpoint_auth_methods_supported.includes("none")
      ) {
        throw new HmtOAuthError(
          "HMT OAuth server does not support the required public PKCE flow.",
        );
      }

      return payload;
    };
  const isLoopbackOAuthRedirect = (value: string): boolean => {
    try {
      const hostname = new URL(value).hostname;
      return (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1"
      );
    } catch {
      return false;
    }
  };
  const createHmtOAuthTransaction = async (
    returnPath: string,
    locale: string,
  ): Promise<HmtOAuthStart> => {
    const state = randomBytes(24).toString("base64url");
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");
    const redirectUri = getHmtOAuthRedirectUri();

    if (
      HMT_OAUTH_CLIENT_ID === "hmt-booking-engine" &&
      !isLoopbackOAuthRedirect(redirectUri)
    ) {
      logger.error(
        {
          clientId: HMT_OAUTH_CLIENT_ID,
          redirectUri,
        },
        "Local HMT OAuth client cannot be used with a public redirect URI",
      );
      throw new HmtOAuthError(
        "HMT_OAUTH_CLIENT_ID must be configured for public deployments",
      );
    }

    await setHmtOAuthTransaction({
      state,
      codeVerifier,
      locale: locale.trim() || "pt",
      returnPath: sanitizeReturnPath(returnPath),
    });

    return {
      clientId: HMT_OAUTH_CLIENT_ID,
      redirectUri,
      state,
      codeChallenge,
      codeChallengeMethod: HMT_OAUTH_CODE_CHALLENGE_METHOD,
    };
  };
  const createHmtOAuthBridgeUrl = async ({
    locale,
    returnPath,
  }: {
    locale: string;
    returnPath: string;
  }): Promise<string> => {
    const start = await createHmtOAuthTransaction(returnPath, locale);

    logger.info(
      {
        clientId: start.clientId,
        redirectUri: start.redirectUri,
      },
      "Starting HMT delegated OAuth authorization",
    );

    const url = new URL("/oauth/hmt-wallet", `${getHmtAuthUiBaseUrl()}/`);

    url.searchParams.set("intent", "wallet");
    url.searchParams.set("client_id", start.clientId);
    url.searchParams.set("redirect_uri", start.redirectUri);
    url.searchParams.set("state", start.state);
    url.searchParams.set("code_challenge", start.codeChallenge);
    url.searchParams.set("code_challenge_method", start.codeChallengeMethod);

    return url.toString();
  };
  const createHmtOAuthAuthorization = async (
    globalAccessToken: string,
    start: HmtOAuthStart,
  ): Promise<HmtOAuthAuthorizationResponse> => {
    const token = globalAccessToken.trim();
    if (!token) {
      throw new HmtOAuthError(
        "Global authentication is required to authorize HMT.",
      );
    }

    const metadata = await getHmtOAuthMetadata();
    const body: HmtCreateOAuthAuthorizationRequest = {
      clientId: start.clientId,
      redirectUri: start.redirectUri,
      state: start.state,
      codeChallenge: start.codeChallenge,
      codeChallengeMethod: start.codeChallengeMethod,
    };
    const response = await fetch(
      resolveOAuthBackchannelUrl(metadata.authorization_endpoint),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        cache: "no-store",
      },
    );
    const payload = await readJson(response);

    if (!response.ok) {
      throw new HmtOAuthError(
        `HMT OAuth authorization failed with status ${response.status}.`,
        response.status,
      );
    }

    if (!isAuthorizationResponse(payload)) {
      throw new HmtOAuthError("HMT OAuth authorization response is invalid.");
    }

    return payload;
  };
  const statesMatch = (expected: string, received: string): boolean => {
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);

    if (expectedBuffer.length !== receivedBuffer.length) return false;
    return timingSafeEqual(expectedBuffer, receivedBuffer);
  };
  const exchangeHmtOAuthAuthorizationCode = async ({
    code,
    state,
  }: {
    code: string;
    state: string;
  }): Promise<{
    accessToken: string;
    expiresIn: number;
    locale: string;
    returnPath: string;
  }> => {
    const transaction = await getHmtOAuthTransaction();
    if (!transaction) {
      throw new HmtOAuthError("HMT OAuth transaction is missing or expired.");
    }

    if (
      !code.trim() ||
      !state.trim() ||
      !statesMatch(transaction.state, state)
    ) {
      await clearHmtOAuthTransaction();
      throw new HmtOAuthError("HMT OAuth state is invalid.");
    }

    // A callback transaction is single-use. A failed exchange starts a fresh flow.
    await clearHmtOAuthTransaction();

    const metadata = await getHmtOAuthMetadata();
    const form = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: HMT_OAUTH_CLIENT_ID,
      code,
      redirect_uri: getHmtOAuthRedirectUri(),
      code_verifier: transaction.codeVerifier,
    });
    const response = await fetch(
      resolveOAuthBackchannelUrl(metadata.token_endpoint),
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
        cache: "no-store",
      },
    );
    const payload = await readJson(response);

    if (!response.ok) {
      throw new HmtOAuthError(
        `HMT OAuth token exchange failed with status ${response.status}.`,
        response.status,
      );
    }

    if (
      !isTokenResponse(payload) ||
      !payload.access_token.trim() ||
      payload.token_type.toLowerCase() !== "bearer" ||
      !Number.isFinite(payload.expires_in) ||
      payload.expires_in <= 0
    ) {
      throw new HmtOAuthError("HMT OAuth token response is invalid.");
    }

    return {
      accessToken: payload.access_token,
      expiresIn: payload.expires_in,
      locale: transaction.locale || "pt",
      returnPath: transaction.returnPath,
    };
  };
  return {
    getHmtOAuthMetadata,
    createHmtOAuthTransaction,
    createHmtOAuthBridgeUrl,
    createHmtOAuthAuthorization,
    exchangeHmtOAuthAuthorizationCode,
  };
}

import type { createHmtConfig } from "./hmt-wallet.config";
import type { createHmtSession } from "./hmt-live.session";
