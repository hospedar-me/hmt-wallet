import { useWalletRuntime } from "../../runtime";
("use client");

import { translateUi, uiCopies } from "../../i18n";
import { useLocale as useCopyLocale } from "../../runtime";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, History, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../../ui/button";
import type { HmtLiveEntryResponse } from "../../types/hmt-live";
import {
  formatHmtDateTime,
  formatHmtMoney,
} from "../../utils/hmt-wallet.format";

type HmtTransactionsViewProps = {
  onBack: () => void;
};

const getGroupLabel = (value: string, locale: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()))
    return translateUi(locale, "walletDays.other");

  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const startOfEntry = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfEntry.getTime()) / 86_400_000,
  );

  if (dayDiff === 0) return translateUi(locale, "walletDays.today");
  if (dayDiff === 1) return translateUi(locale, "walletDays.yesterday");

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

export const HmtTransactionsView = ({ onBack }: HmtTransactionsViewProps) => {
  const { actionListHmtEntries } = useWalletRuntime().operations;
  const copyLocale = useCopyLocale();
  const [entries, setEntries] = useState<HmtLiveEntryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await actionListHmtEntries();
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setEntries(
      [...result.data].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => {
    const grouped = new Map<string, HmtLiveEntryResponse[]>();

    for (const entry of entries) {
      const label = getGroupLabel(entry.createdAt, copyLocale);
      grouped.set(label, [...(grouped.get(label) ?? []), entry]);
    }

    return [...grouped.entries()];
  }, [copyLocale, entries]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label={translateUi(copyLocale, "HmtTransactionsView.back")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--restinga)]">
            {translateUi(copyLocale, "HmtTransactionsView.carteira")}
          </p>
          <h2 className="font-serif text-2xl text-[var(--graphite)]">
            {translateUi(copyLocale, "HmtTransactionsView.movimentacoes")}
          </h2>
        </div>
      </div>

      {loading && (
        <div className="flex min-h-48 items-center justify-center text-[var(--graphite)]/60">
          <Loader2 className="mr-2 size-5 animate-spin motion-reduce:animate-none" />
          {translateUi(
            copyLocale,
            "HmtTransactionsView.carregandoMovimentacoes",
          )}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => void load()}
          >
            <RefreshCw className="size-4" />
            {translateUi(copyLocale, "HmtTransactionsView.tentarNovamente")}
          </Button>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-[var(--graphite)]/55">
          <History className="mx-auto mb-3 size-6" />
          <p className="text-sm">
            {translateUi(
              copyLocale,
              "HmtTransactionsView.nenhumaMovimentacaoRegistrada",
            )}
          </p>
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="space-y-6">
          {groups.map(([label, groupEntries]) => (
            <section key={label}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--graphite)]/45">
                {label}
              </h3>
              <div className="overflow-hidden rounded-3xl border border-border bg-white/60">
                {groupEntries.map((entry, index) => {
                  const incoming = entry.amountInCents >= 0;
                  return (
                    <div
                      key={entry.id}
                      className={`flex items-start justify-between gap-4 px-5 py-4 ${
                        index > 0 ? "border-t border-border/70" : ""
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-[var(--graphite)]">
                          {entry.entryType}
                        </p>
                        <p className="mt-1 text-xs text-[var(--graphite)]/50">
                          {uiCopies[copyLocale.startsWith("pt") ? "pt" : "en"]
                            .walletBalanceBuckets[
                            entry.balanceBucket as keyof typeof uiCopies.pt.walletBalanceBuckets
                          ] ?? entry.balanceBucket}{" "}
                          · {formatHmtDateTime(entry.createdAt)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-[var(--graphite)]">
                          {incoming ? "+" : "−"}{" "}
                          {formatHmtMoney(Math.abs(entry.amountInCents))}
                        </p>
                        <p className="mt-1 text-[11px] uppercase tracking-wide text-[var(--graphite)]/45">
                          {incoming
                            ? translateUi(copyLocale, "walletCopy.incoming")
                            : translateUi(
                                copyLocale,
                                "HmtTransactionsView.saida",
                              )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};
