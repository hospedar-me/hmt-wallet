import { buildHmtWalletOAuthCallbackUrl } from "../utils/hmt-wallet.oauth";

export function createHmtConfig(env: Record<string, string | undefined>) {
  const HMT_LIVE_BASE_URL_ENV = "HMT_LIVE_BASE_URL";
  const HMT_AUTH_BASE_URL_ENV = "HMT_AUTH_BASE_URL";
  const HMT_AUTH_UI_BASE_URL_ENV = "HMT_AUTH_UI_BASE_URL";
  const HMT_BOOKING_ENGINE_OAUTH_REDIRECT_URI_ENV =
    "HMT_BOOKING_ENGINE_OAUTH_REDIRECT_URI";
  const HMT_OAUTH_REDIRECT_URI_ENV = "HMT_OAUTH_REDIRECT_URI";
  const HMT_OAUTH_CLIENT_ID_ENV = "HMT_OAUTH_CLIENT_ID";
  const BACKEND_URL_ENV = "BACKEND_URL";
  const FRONTEND_BASE_URL_ENV = "FRONTEND_BASE_URL";
  const HOTEL_BASE_URL_ENV = "HOTEL_BASE_URL";
  const HMT_OAUTH_CLIENT_ID =
    env[HMT_OAUTH_CLIENT_ID_ENV]?.trim() || "hmt-booking-engine";
  const HMT_OAUTH_CODE_CHALLENGE_METHOD = "S256" as const;
  const normalizeBaseUrl = (value: string) => value.trim().replace(/\/+$/, "");
  const readOptionalEnv = (name: string) => {
    const value = env[name]?.trim();
    return value || null;
  };
  const requireEnv = (name: string, value: string | null) => {
    if (!value) {
      throw new Error(`${name} is not configured.`);
    }

    return value;
  };
  const getHmtLiveBaseUrl = (): string =>
    normalizeBaseUrl(
      requireEnv(HMT_LIVE_BASE_URL_ENV, readOptionalEnv(HMT_LIVE_BASE_URL_ENV)),
    );
  const getHmtAuthBaseUrl = (): string => {
    const configured =
      readOptionalEnv(HMT_AUTH_BASE_URL_ENV) ??
      readOptionalEnv(BACKEND_URL_ENV);

    return normalizeBaseUrl(
      requireEnv(`${HMT_AUTH_BASE_URL_ENV} or ${BACKEND_URL_ENV}`, configured),
    );
  };
  const getHmtAuthUiBaseUrl = (): string => {
    const configured =
      readOptionalEnv(HMT_AUTH_UI_BASE_URL_ENV) ??
      readOptionalEnv(FRONTEND_BASE_URL_ENV);

    return normalizeBaseUrl(
      requireEnv(
        `${HMT_AUTH_UI_BASE_URL_ENV} or ${FRONTEND_BASE_URL_ENV}`,
        configured,
      ),
    );
  };
  const getHmtOAuthRedirectUri = (): string => {
    const hotelBaseUrl = readOptionalEnv(HOTEL_BASE_URL_ENV);
    const configured =
      readOptionalEnv(HMT_BOOKING_ENGINE_OAUTH_REDIRECT_URI_ENV) ??
      (hotelBaseUrl ? buildHmtWalletOAuthCallbackUrl(hotelBaseUrl) : null) ??
      readOptionalEnv(HMT_OAUTH_REDIRECT_URI_ENV);

    return requireEnv(
      `${HMT_BOOKING_ENGINE_OAUTH_REDIRECT_URI_ENV}, ${HOTEL_BASE_URL_ENV} or ${HMT_OAUTH_REDIRECT_URI_ENV}`,
      configured,
    );
  };
  const isHmtWalletAvailable = (): boolean => {
    if (env.BOOKING_WALLET_ENABLED === "false") return false;
    const hasLiveApi = Boolean(readOptionalEnv(HMT_LIVE_BASE_URL_ENV));
    const hasAuthIssuer = Boolean(
      readOptionalEnv(HMT_AUTH_BASE_URL_ENV) ??
        readOptionalEnv(BACKEND_URL_ENV),
    );
    const hasAuthUi = Boolean(
      readOptionalEnv(HMT_AUTH_UI_BASE_URL_ENV) ??
        readOptionalEnv(FRONTEND_BASE_URL_ENV),
    );
    const hasRedirectUri = Boolean(
      readOptionalEnv(HMT_BOOKING_ENGINE_OAUTH_REDIRECT_URI_ENV) ??
        readOptionalEnv(HOTEL_BASE_URL_ENV) ??
        readOptionalEnv(HMT_OAUTH_REDIRECT_URI_ENV),
    );

    return hasLiveApi && hasAuthIssuer && hasAuthUi && hasRedirectUri;
  };
  return {
    HMT_OAUTH_CLIENT_ID,
    HMT_OAUTH_CODE_CHALLENGE_METHOD,
    getHmtLiveBaseUrl,
    getHmtAuthBaseUrl,
    getHmtAuthUiBaseUrl,
    getHmtOAuthRedirectUri,
    isHmtWalletAvailable,
  };
}
