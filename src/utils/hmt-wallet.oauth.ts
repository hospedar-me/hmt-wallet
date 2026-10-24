export const buildHmtWalletOAuthCallbackUrl = (baseUrl: string): string => {
  const trimmed = baseUrl.trim();
  const url = new URL(trimmed);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(
      "HMT Wallet OAuth callback base URL must use HTTP or HTTPS.",
    );
  }

  url.pathname = "/api/hmt-wallet/oauth/callback";
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/$/, "");
};
