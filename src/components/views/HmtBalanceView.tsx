import { useWalletRuntime } from "../../runtime";
("use client");

import { translateUi } from "../../i18n";
import { useLocale as useCopyLocale } from "../../runtime";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../ui/alert-dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import type { HmtLiveBalanceResponse } from "../../types/hmt-live";
import {
  formatHmtMoney,
  parseHmtAmountInCents,
} from "../../utils/hmt-wallet.format";

type HmtBalanceViewProps = {
  onBack: () => void;
};

type Operation = "fund" | "withdraw";

export const HmtBalanceView = ({ onBack }: HmtBalanceViewProps) => {
  const { actionFundHmtWallet, actionGetHmtBalance, actionWithdrawHmtWallet } =
    useWalletRuntime().operations;
  const copyLocale = useCopyLocale();
  const [balance, setBalance] = useState<HmtLiveBalanceResponse | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await actionGetHmtBalance();
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setBalance(result.data);
  }, []);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  const runOperation = async (operation: Operation) => {
    if (isMutating) return;

    const amountInCents = parseHmtAmountInCents(amount);
    if (!amountInCents) {
      setSuccess(null);
      setError(
        translateUi(copyLocale, "HmtBalanceView.informeUmValorMaiorQueZero"),
      );
      return;
    }

    setIsMutating(true);
    setError(null);
    setSuccess(null);

    const body = {
      amountInCents,
      idempotencyKey: crypto.randomUUID(),
    };
    const result =
      operation === "fund"
        ? await actionFundHmtWallet(body)
        : await actionWithdrawHmtWallet(body);

    setIsMutating(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setBalance(result.data);
    setAmount("");
    setSuccess(
      operation === "fund"
        ? translateUi(copyLocale, "HmtBalanceView.saldoAdicionadoComSucesso")
        : translateUi(copyLocale, "HmtBalanceView.retiradaConcluidaComSucesso"),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label={translateUi(copyLocale, "HmtBalanceView.back")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--restinga)]">
            {translateUi(copyLocale, "HmtBalanceView.carteira")}
          </p>
          <h2 className="font-serif text-2xl text-[var(--graphite)]">
            {translateUi(copyLocale, "HmtBalanceView.balance")}
          </h2>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-36 items-center justify-center text-[var(--graphite)]/60">
          <Loader2 className="mr-2 size-5 animate-spin motion-reduce:animate-none" />
          {translateUi(copyLocale, "HmtBalanceView.carregandoSaldo")}
        </div>
      ) : balance ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-[var(--graphite)] p-5 text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-white/50">
              {translateUi(copyLocale, "HmtBalanceView.disponivel")}
            </p>
            <p className="mt-2 font-serif text-2xl">
              {formatHmtMoney(balance.availableInCents)}
            </p>
          </div>
          <div className="rounded-3xl border border-border bg-white/65 p-5 text-[var(--graphite)]">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--graphite)]/45">
              {translateUi(copyLocale, "HmtBalanceView.pending")}
            </p>
            <p className="mt-2 font-serif text-2xl">
              {formatHmtMoney(balance.pendingInCents)}
            </p>
          </div>
        </div>
      ) : (
        <Button variant="outline" onClick={() => void loadBalance()}>
          <RefreshCw className="size-4" />
          {translateUi(copyLocale, "HmtBalanceView.recarregarSaldo")}
        </Button>
      )}

      <div className="rounded-3xl border border-border bg-white/65 p-5">
        <Label htmlFor="hmt-wallet-amount">
          {translateUi(copyLocale, "HmtBalanceView.amount")}
        </Label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--graphite)]/45">
            {translateUi(copyLocale, "HmtBalanceView.r")}
          </span>
          <Input
            id="hmt-wallet-amount"
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0,00"
            className="pl-10"
            disabled={isMutating}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button
            disabled={isMutating}
            onClick={() => void runOperation("fund")}
          >
            {isMutating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="size-4" />
            )}
            {translateUi(copyLocale, "HmtBalanceView.adicionar")}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isMutating || !amount}>
                <ArrowUpFromLine className="size-4" />
                {translateUi(copyLocale, "HmtBalanceView.retirar")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {translateUi(copyLocale, "HmtBalanceView.confirmarRetirada")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {translateUi(
                    copyLocale,
                    "HmtBalanceView.aOperacaoSeraEnviadaAoHMTEAlteraraOSaldoDisponivelDaSuaContaDeTestes",
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {translateUi(copyLocale, "HmtBalanceView.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void runOperation("withdraw")}
                >
                  {translateUi(copyLocale, "HmtBalanceView.confirmarRetirada")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-4 flex items-center gap-2 text-sm text-[var(--restinga)]">
            <CheckCircle2 className="size-4" />
            {success}
          </p>
        )}
      </div>
    </div>
  );
};
