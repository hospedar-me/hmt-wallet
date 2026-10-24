import type { createHmtConfig } from "./hmt-wallet.config";
import type { createHmtSession } from "./hmt-live.session";
import type { createHmtAuth } from "./hmt-live.auth";
export function createHmtCallback(options: {
  config: ReturnType<typeof createHmtConfig>;
  session: ReturnType<typeof createHmtSession>;
  auth: ReturnType<typeof createHmtAuth>;
}) {
  return async (input: {
    code: string | null;
    state: string | null;
    error: string | null;
  }) => {
    const transaction = await options.session.getHmtOAuthTransaction();
    const locale = transaction?.locale === "en" ? "en" : "pt";
    const returnPath = transaction?.returnPath || "/";
    const target = (
      locale: string,
      returnPath: string,
      status: "success" | "error",
    ) => {
      const url = new URL(
        "/" + (locale === "en" ? "en" : "pt") + "/hmt-wallet/oauth/return",
        new URL(options.config.getHmtOAuthRedirectUri()).origin,
      );
      url.searchParams.set("status", status);
      url.searchParams.set("returnPath", returnPath);
      return url;
    };
    if (input.error || !input.code || !input.state) {
      await options.session.clearHmtOAuthTransaction();
      return { target: target(locale, returnPath, "error") };
    }
    try {
      const result = await options.auth.exchangeHmtOAuthAuthorizationCode({
        code: input.code,
        state: input.state,
      });
      return {
        target: target(result.locale, result.returnPath, "success"),
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      };
    } catch {
      return { target: target(locale, returnPath, "error") };
    }
  };
}
export function hmtPopupNavigationHtml(target: URL) {
  const href = target.toString();
  return (
    '<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=' +
    href +
    '"><title>HMT</title></head><body><script>window.location.replace(' +
    JSON.stringify(href) +
    ");</script></body></html>"
  );
}
