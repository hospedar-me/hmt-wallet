import { useWalletRuntime } from "../../runtime";
("use client");

import { translateUi } from "../../i18n";
import { useLocale as useCopyLocale } from "../../runtime";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  CreditCard,
  History,
  Loader2,
  QrCode,
  RefreshCw,
} from "lucide-react";
import { Button } from "../../ui/button";
import type {
  HmtLiveBalanceResponse,
  HmtLiveEntryResponse,
} from "../../types/hmt-live";
import {
  formatHmtDateTime,
  formatHmtMoney,
} from "../../utils/hmt-wallet.format";

export type HmtWalletView =
  | "home"
  | "balance"
  | "transactions"
  | "cards"
  | "pix";

type HmtWalletHomeViewProps = {
  onNavigate: (view: HmtWalletView) => void;
};

type HomeState = {
  balance: HmtLiveBalanceResponse | null;
  entries: HmtLiveEntryResponse[];
  error: string | null;
  loading: boolean;
};

const initialState: HomeState = {
  balance: null,
  entries: [],
  error: null,
  loading: true,
};

export const HmtWalletHomeView = ({ onNavigate }: HmtWalletHomeViewProps) => {
  const { actionGetHmtBalance, actionListHmtEntries } =
    useWalletRuntime().operations;
  const copyLocale = useCopyLocale();
  const [state, setState] = useState<HomeState>(initialState);

  const load = useCallback(async () => {
    setState((current) => ({ ...current, error: null, loading: true }));
    const [balanceResult, entriesResult] = await Promise.all([
      actionGetHmtBalance(),
      actionListHmtEntries(),
    ]);

    if (balanceResult.error) {
      setState((current) => ({
        ...current,
        error: balanceResult.error.message,
        loading: false,
      }));
      return;
    }

    if (entriesResult.error) {
      setState((current) => ({
        ...current,
        error: entriesResult.error.message,
        loading: false,
      }));
      return;
    }

    setState({
      balance: balanceResult.data,
      entries: [...entriesResult.data]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 4),
      error: null,
      loading: false,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (state.loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-[var(--graphite)]/65">
        <Loader2 className="mr-2 size-5 animate-spin motion-reduce:animate-none" />
        {translateUi(copyLocale, "HmtWalletHomeView.carregandoCarteira")}
      </div>
    );
  }

  if (state.error || !state.balance) {
    return (
      <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6">
        <p className="font-semibold text-[var(--graphite)]">
          {translateUi(
            copyLocale,
            "HmtWalletHomeView.naoFoiPossivelCarregarSuaCarteira",
          )}
        </p>
        {state.error && (
          <p className="mt-2 text-sm text-[var(--graphite)]/65">
            {state.error}
          </p>
        )}
        <Button variant="outline" className="mt-5" onClick={() => void load()}>
          <RefreshCw className="size-4" />
          {translateUi(copyLocale, "HmtWalletHomeView.tentarNovamente")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl bg-[var(--graphite)] p-6 text-white shadow-md">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
          {translateUi(copyLocale, "HmtWalletHomeView.saldoDisponivel")}
        </p>
        <p className="mt-3 font-serif text-4xl tracking-tight">
          {formatHmtMoney(state.balance.availableInCents)}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-sm">
          <span className="text-white/55">
            {translateUi(copyLocale, "HmtWalletHomeView.pending")}
          </span>
          <span className="font-medium">
            {formatHmtMoney(state.balance.pendingInCents)}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-4 gap-2">
        <button
          type="button"
          className="flex min-w-0 flex-col items-center gap-2 rounded-2xl p-2 text-center text-xs font-medium text-[var(--graphite)] transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--champagne)]"
          onClick={() => onNavigate("balance")}
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--mist)] text-[var(--ocean)]">
            <ArrowDownToLine className="size-5" />
          </span>
          {translateUi(copyLocale, "HmtWalletHomeView.adicionar")}
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-col items-center gap-2 rounded-2xl p-2 text-center text-xs font-medium text-[var(--graphite)] transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--champagne)]"
          onClick={() => onNavigate("balance")}
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--sand)]/55 text-[var(--wood)]">
            <ArrowUpFromLine className="size-5" />
          </span>
          {translateUi(copyLocale, "HmtWalletHomeView.retirar")}
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-col items-center gap-2 rounded-2xl p-2 text-center text-xs font-medium text-[var(--graphite)] transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--champagne)]"
          onClick={() => onNavigate("cards")}
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-[var(--restinga)] shadow-sm">
            <CreditCard className="size-5" />
          </span>
          {translateUi(copyLocale, "HmtWalletHomeView.cartoes")}
        </button>
        <button
          type="button"
          aria-label={translateUi(copyLocale, "HmtWalletHomeView.pagarComPIX")}
          className="flex min-w-0 flex-col items-center gap-2 rounded-2xl p-2 text-center text-xs font-medium text-[var(--graphite)] transition-colors hover:bg-white/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--champagne)]"
          onClick={() => onNavigate("pix")}
        >
          <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--mist)] text-[var(--ocean)]">
            <QrCode className="size-5" />
          </span>
          {translateUi(copyLocale, "HmtWalletHomeView.pIX")}
        </button>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--restinga)]">
              {translateUi(copyLocale, "HmtWalletHomeView.atividade")}
            </p>
            <h2 className="mt-1 font-serif text-xl text-[var(--graphite)]">
              {translateUi(
                copyLocale,
                "HmtWalletHomeView.movimentacoesRecentes",
              )}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate("transactions")}
          >
            {translateUi(copyLocale, "HmtWalletHomeView.verTodas")}
            <ArrowRight className="size-4" />
          </Button>
        </div>

        {state.entries.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border px-5 py-8 text-center text-sm text-[var(--graphite)]/55">
            <History className="mx-auto mb-3 size-5" />
            {translateUi(
              copyLocale,
              "HmtWalletHomeView.nenhumaMovimentacaoRegistrada",
            )}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border bg-white/60">
            {state.entries.map((entry, index) => {
              const incoming = entry.amountInCents >= 0;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between gap-4 px-5 py-4 ${
                    index > 0 ? "border-t border-border/70" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--graphite)]">
                      {entry.entryType}
                    </p>
                    <p className="mt-1 text-xs text-[var(--graphite)]/50">
                      {formatHmtDateTime(entry.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[var(--graphite)]">
                      {incoming ? "+" : "−"}{" "}
                      {formatHmtMoney(Math.abs(entry.amountInCents))}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-[var(--graphite)]/45">
                      {incoming
                        ? translateUi(copyLocale, "walletCopy.incoming")
                        : translateUi(copyLocale, "HmtWalletHomeView.saida")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
