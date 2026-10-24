"use client";

import { translateUi } from "../i18n";
import { ShadowSurface } from "../ShadowSurface";

import { useEffect, useState } from "react";

import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { Button } from "../ui/button";

type PopupStatus = "success" | "error";

const readStatus = (): PopupStatus => {
  const status = new URLSearchParams(window.location.search).get("status");
  return status === "success" ? "success" : "error";
};

const readReturnPath = () => {
  const value = new URLSearchParams(window.location.search).get("returnPath");
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
};

function OAuthReturnContent({ locale: copyLocale }: { locale: string }) {
  const [status] = useState<PopupStatus>(readStatus);
  const [returnPath] = useState(readReturnPath);

  useEffect(() => {
    const nextStatus = readStatus();
    const nextReturnPath = readReturnPath();

    if (!window.opener) return;

    const opener = window.opener;
    let acknowledged = false;

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.source !== opener) return;
      if (!event.data || event.data.type !== "hmt-wallet-auth-ack") return;

      acknowledged = true;
      window.removeEventListener("message", onMessage);
      window.close();
    };

    window.addEventListener("message", onMessage);
    opener.postMessage(
      {
        type: "hmt-wallet-auth-result",
        status: nextStatus,
      },
      window.location.origin,
    );

    const closeTimer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      if (!acknowledged) {
        window.close();
      }
    }, 1500);

    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(closeTimer);
    };
  }, []);

  const success = status === "success";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[var(--off-white)] px-6 py-10">
      <div className="w-full max-w-md rounded-3xl border border-border bg-white p-7 text-center shadow-xl">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--mist)] text-[var(--ocean)]">
          {success ? (
            <CheckCircle2 className="size-6" />
          ) : (
            <CircleAlert className="size-6" />
          )}
        </div>
        <h1 className="mt-5 font-serif text-2xl text-[var(--graphite)]">
          {success
            ? translateUi(copyLocale, "page.hMTWalletConectada")
            : translateUi(copyLocale, "page.autenticacaoNaoConcluida")}
        </h1>
        <p className="mt-2 text-sm leading-6 text-[var(--graphite)]/65">
          {success
            ? translateUi(
                copyLocale,
                "page.aSessaoHMTFoiCriadaVocePodeVoltarParaAJanelaPrincipal",
              )
            : translateUi(
                copyLocale,
                "page.naoFoiPossivelCriarASessaoHMTVocePodeFecharEstaJanelaETentarNovamente",
              )}
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Button type="button" onClick={() => window.close()}>
            <X className="size-4" />
            {translateUi(copyLocale, "page.fecharJanela")}
          </Button>
          <Button asChild variant="ghost">
            <a href={returnPath}>
              {translateUi(copyLocale, "page.voltarParaOBookingEngine")}
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}

export function HmtWalletOAuthReturn({ locale }: { locale: string }) {
  return (
    <ShadowSurface>
      {() => <OAuthReturnContent locale={locale} />}
    </ShadowSurface>
  );
}
