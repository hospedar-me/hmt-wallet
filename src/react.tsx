"use client";
import { WalletContext } from "./runtime";
import type { WalletOperations } from "./types";
import { HmtWalletClient } from "./components/HmtWalletClient";
import { ShadowSurface } from "./ShadowSurface";
export type HmtWalletProps = {
  enabled: boolean;
  environment: "test" | "homologation" | "production";
  locale: string;
  operations: WalletOperations;
};
export function HmtWalletWidget(props: HmtWalletProps) {
  if (!props.enabled || !["test", "homologation"].includes(props.environment))
    return null;
  return (
    <ShadowSurface>
      {(root) => (
        <WalletContext.Provider
          value={{
            operations: props.operations,
            locale: props.locale,
            portalContainer: root,
          }}
        >
          <HmtWalletClient />
        </WalletContext.Provider>
      )}
    </ShadowSurface>
  );
}
export { HmtWalletOAuthReturn } from "./components/HmtWalletOAuthReturn";
