import { useWalletRuntime } from "../runtime";
("use client");

import { translateUi } from "../i18n";
import { useLocale as useCopyLocale } from "../runtime";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "../runtime";
import {
  CircleAlert,
  Loader2,
  LogOut,
  UserPlus,
  WalletCards,
  X,
} from "lucide-react";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../ui/drawer";
import type { HmtLivePayerResponse } from "../types/hmt-live";
import { HmtBalanceView } from "./views/HmtBalanceView";
import { HmtCardsView } from "./views/HmtCardsView";
import { HmtPixView } from "./views/HmtPixView";
import { HmtTransactionsView } from "./views/HmtTransactionsView";
import {
  HmtWalletHomeView,
  type HmtWalletView,
} from "./views/HmtWalletHomeView";

type HmtDrawerProps = {
  open: boolean;
  view: HmtWalletView;
  onViewChange: (view: HmtWalletView) => void;
  onOpenChange: (open: boolean) => void;
};

type WalletState =
  | { kind: "loading" }
  | { kind: "logged-out" }
  | { kind: "no-payer" }
  | { kind: "payer"; payer: HmtLivePayerResponse }
  | { kind: "error"; message: string };

export const HmtDrawer = ({
  open,
  view,
  onViewChange,
  onOpenChange,
}: HmtDrawerProps) => {
  const {
    actionCreateHmtPayer,
    actionGetHmtPayer,
    actionLogoutHmt,
    actionStartHmtOAuth,
  } = useWalletRuntime().operations;
  const copyLocale = useCopyLocale();
  const locale = useLocale();
  const [walletState, setWalletState] = useState<WalletState>({
    kind: "loading",
  });
  const [isMutating, setIsMutating] = useState(false);
  const [authStartError, setAuthStartError] = useState<string | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const authPopupRef = useRef<Window | null>(null);
  const authPopupPollRef = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 640px)");
    const update = () => setIsDesktop(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const loadWalletState = useCallback(async () => {
    setWalletState({ kind: "loading" });
    const result = await actionGetHmtPayer();

    if (result.error) {
      if (result.error.code === "hmt_auth_required") {
        onViewChange("home");
        setWalletState({ kind: "logged-out" });
        return "logged-out" as const;
      }

      setWalletState({ kind: "error", message: result.error.message });
      return "error" as const;
    }

    if (!result.data) {
      onViewChange("home");
      setWalletState({ kind: "no-payer" });
      return "authenticated" as const;
    }

    setWalletState({ kind: "payer", payer: result.data });
    return "authenticated" as const;
  }, [onViewChange]);

  useEffect(() => {
    if (!open) {
      setAuthStartError(null);
      return;
    }

    void loadWalletState();
  }, [loadWalletState, open]);

  const stopPopupPolling = useCallback(() => {
    if (authPopupPollRef.current !== null) {
      window.clearInterval(authPopupPollRef.current);
      authPopupPollRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      const popup = authPopupRef.current;
      if (!popup || event.source !== popup) return;

      if (
        !event.data ||
        event.data.type !== "hmt-wallet-auth-result" ||
        (event.data.status !== "success" && event.data.status !== "error")
      ) {
        return;
      }

      stopPopupPolling();

      popup.postMessage(
        { type: "hmt-wallet-auth-ack" },
        window.location.origin,
      );

      authPopupRef.current = null;
      setIsMutating(false);

      if (event.data.status === "success") {
        setAuthStartError(null);
        void loadWalletState();
        return;
      }

      setAuthStartError(
        translateUi(
          copyLocale,
          "HmtDrawer.naoFoiPossivelConcluirAAutenticacaoHMT",
        ),
      );
    };

    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      stopPopupPolling();
    };
  }, [copyLocale, loadWalletState, stopPopupPolling]);

  const startOAuth = async () => {
    setAuthStartError(null);

    const popup = window.open(
      "",
      "hmt-wallet-auth",
      "popup=yes,width=520,height=720,resizable=yes,scrollbars=yes",
    );

    if (!popup) {
      setAuthStartError(
        translateUi(
          copyLocale,
          "HmtDrawer.oNavegadorBloqueouAJanelaDeAutenticacaoPermitaPopupsETenteNovamente",
        ),
      );
      return;
    }

    authPopupRef.current = popup;
    setIsMutating(true);
    popup.document.title = "HMT Wallet";

    const returnPath = `${window.location.pathname}${window.location.search}`;
    const result = await actionStartHmtOAuth({ locale, returnPath });

    if (result.error) {
      popup.close();
      authPopupRef.current = null;
      setIsMutating(false);
      setAuthStartError(result.error.message);
      return;
    }

    popup.location.replace(result.data.authorizationUrl);
    popup.focus();

    stopPopupPolling();
    authPopupPollRef.current = window.setInterval(() => {
      if (!popup.closed) return;

      stopPopupPolling();
      if (authPopupRef.current !== popup) return;

      authPopupRef.current = null;
      setIsMutating(false);

      void loadWalletState().then((state) => {
        if (state === "authenticated") {
          setAuthStartError(null);
          return;
        }

        if (state === "logged-out") {
          setAuthStartError(
            translateUi(
              copyLocale,
              "HmtDrawer.aJanelaDeAutenticacaoFoiFechadaAntesDaConclusao",
            ),
          );
        }
      });
    }, 500);
  };

  const createPayer = async () => {
    setIsMutating(true);
    const result = await actionCreateHmtPayer();
    setIsMutating(false);

    if (result.error) {
      setWalletState({ kind: "error", message: result.error.message });
      return;
    }

    onViewChange("home");
    setWalletState({ kind: "payer", payer: result.data });
  };

  const logout = async () => {
    setIsMutating(true);
    await actionLogoutHmt();
    setIsMutating(false);
    onViewChange("home");
    setWalletState({ kind: "logged-out" });
  };

  const renderPayerView = () => {
    if (walletState.kind !== "payer") return null;

    switch (view) {
      case "balance":
        return <HmtBalanceView onBack={() => onViewChange("home")} />;
      case "transactions":
        return <HmtTransactionsView onBack={() => onViewChange("home")} />;
      case "cards":
        return <HmtCardsView onBack={() => onViewChange("home")} />;
      case "pix":
        return <HmtPixView onBack={() => onViewChange("home")} />;
      case "home":
      default:
        return <HmtWalletHomeView onNavigate={onViewChange} />;
    }
  };

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      direction={isDesktop ? "right" : "bottom"}
      shouldScaleBackground={false}
    >
      <DrawerContent className="!h-[88dvh] !max-h-[88dvh] !rounded-t-3xl border-border bg-[var(--off-white)] p-0 sm:!h-dvh sm:!max-h-dvh sm:!w-[420px] sm:!max-w-[420px] sm:!rounded-l-3xl sm:!rounded-r-none">
        <div className="flex h-full min-h-0 flex-col">
          <DrawerHeader className="relative border-b border-border px-6 pb-5 pt-6 text-left">
            <div className="mb-2 flex size-10 items-center justify-center rounded-2xl bg-[var(--graphite)] text-white shadow-sm">
              <WalletCards className="size-5" strokeWidth={1.8} />
            </div>
            <DrawerTitle className="font-serif text-2xl text-[var(--graphite)]">
              {translateUi(copyLocale, "HmtDrawer.hMTWallet")}
            </DrawerTitle>
            <DrawerDescription>
              {translateUi(
                copyLocale,
                "HmtDrawer.carteiraDeTestesDaHospedarMe",
              )}
            </DrawerDescription>
            <DrawerClose asChild>
              <button
                type="button"
                aria-label={translateUi(
                  copyLocale,
                  "HmtDrawer.fecharHMTWallet",
                )}
                className="absolute right-5 top-5 flex size-9 items-center justify-center rounded-full text-[var(--graphite)]/60 transition-colors hover:bg-black/5 hover:text-[var(--graphite)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--champagne)]"
              >
                <X className="size-4" />
              </button>
            </DrawerClose>
          </DrawerHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            {walletState.kind === "loading" && (
              <div className="flex min-h-48 items-center justify-center text-[var(--graphite)]/70">
                <Loader2 className="mr-2 size-5 animate-spin motion-reduce:animate-none" />
                {translateUi(copyLocale, "HmtDrawer.carregandoCarteira")}
              </div>
            )}

            {walletState.kind === "logged-out" && (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-[var(--mist)] text-[var(--ocean)]">
                  <WalletCards className="size-7" />
                </div>
                <h2 className="font-serif text-2xl text-[var(--graphite)]">
                  {translateUi(copyLocale, "HmtDrawer.conecteSuaHMTWallet")}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[var(--graphite)]/65">
                  {translateUi(
                    copyLocale,
                    "HmtDrawer.entreComSuaContaHospedarMeParaContinuar",
                  )}
                </p>
                <Button
                  className="mt-6"
                  disabled={isMutating}
                  onClick={() => void startOAuth()}
                >
                  {isMutating && <Loader2 className="size-4 animate-spin" />}
                  {translateUi(copyLocale, "HmtDrawer.entrarNoHMT")}
                </Button>
                {authStartError && (
                  <p className="mt-3 max-w-sm text-xs text-destructive">
                    {authStartError}
                  </p>
                )}
              </div>
            )}

            {walletState.kind === "no-payer" && (
              <div className="rounded-3xl border border-border bg-white/70 p-6">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--mist)] text-[var(--ocean)]">
                  <UserPlus className="size-5" />
                </div>
                <h2 className="mt-5 font-serif text-2xl text-[var(--graphite)]">
                  {translateUi(copyLocale, "HmtDrawer.crieSuaContaHMT")}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[var(--graphite)]/65">
                  {translateUi(
                    copyLocale,
                    "HmtDrawer.suaAutenticacaoHMTEstaAtivaMasAindaNaoExisteUmaContaPAYERVinculada",
                  )}
                </p>
                <Button
                  className="mt-6"
                  disabled={isMutating}
                  onClick={() => void createPayer()}
                >
                  {isMutating && <Loader2 className="size-4 animate-spin" />}
                  {translateUi(copyLocale, "HmtDrawer.criarContaHMT")}
                </Button>
              </div>
            )}

            {walletState.kind === "payer" && (
              <div>
                {renderPayerView()}
                <div className="mt-8 border-t border-border pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isMutating}
                    onClick={() => void logout()}
                  >
                    {isMutating ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <LogOut className="size-4" />
                    )}
                    {translateUi(copyLocale, "HmtDrawer.sairDoHMT")}
                  </Button>
                </div>
              </div>
            )}

            {walletState.kind === "error" && (
              <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6">
                <CircleAlert className="size-6 text-destructive" />
                <h2 className="mt-4 font-semibold text-[var(--graphite)]">
                  {translateUi(
                    copyLocale,
                    "HmtDrawer.naoFoiPossivelCarregarAHMTWallet",
                  )}
                </h2>
                <p className="mt-2 text-sm text-[var(--graphite)]/65">
                  {walletState.message}
                </p>
                <Button
                  variant="outline"
                  className="mt-5"
                  onClick={() => void loadWalletState()}
                >
                  {translateUi(copyLocale, "HmtDrawer.tentarNovamente")}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
