"use client";
import { createContext, useContext } from "react";
import type { WalletOperations } from "./types";
export type WalletRuntime = {
  operations: WalletOperations;
  locale: string;
  portalContainer: HTMLElement;
};
export const WalletContext = createContext<WalletRuntime | null>(null);
export function useWalletRuntime() {
  const value = useContext(WalletContext);
  if (!value) throw Error("HMT wallet provider missing");
  return value;
}
export const useLocale = () => useWalletRuntime().locale;
export const useWalletPortal = () => useWalletRuntime().portalContainer;
