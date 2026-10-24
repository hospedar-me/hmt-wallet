import { useWalletRuntime } from "../../runtime";
("use client");

import { translateUi, uiCopies } from "../../i18n";
import { useLocale as useCopyLocale } from "../../runtime";

import { useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, QrCode } from "lucide-react";
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
import { Label } from "../../ui/label";
import { Textarea } from "../../ui/textarea";
import type { HmtLivePixPaymentResponse } from "../../types/hmt-live";
import { formatHmtMoney } from "../../utils/hmt-wallet.format";

type HmtPixViewProps = {
  onBack: () => void;
};

export const HmtPixView = ({ onBack }: HmtPixViewProps) => {
  const { actionPayHmtPix } = useWalletRuntime().operations;
  const copyLocale = useCopyLocale();
  const [pixCode, setPixCode] = useState("");
  const [payment, setPayment] = useState<HmtLivePixPaymentResponse | null>(
    null,
  );
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payPix = async () => {
    const normalizedPixCode = pixCode.trim();
    if (!normalizedPixCode || isPaying) return;

    setIsPaying(true);
    setError(null);

    const result = await actionPayHmtPix({ pixCode: normalizedPixCode });

    setIsPaying(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setPayment(result.data);
    setPixCode("");
  };

  if (payment) {
    const approved = payment.status === "approved";

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label={translateUi(copyLocale, "HmtPixView.back")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--restinga)]">
              {translateUi(copyLocale, "HmtPixView.carteira")}
            </p>
            <h2 className="font-serif text-2xl text-[var(--graphite)]">
              {translateUi(copyLocale, "HmtPixView.pIX")}
            </h2>
          </div>
        </div>

        <section className="rounded-3xl border border-border bg-white/70 p-6 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--mist)] text-[var(--ocean)]">
            <CheckCircle2 className="size-6" />
          </span>
          <h3 className="mt-4 font-serif text-2xl text-[var(--graphite)]">
            {approved
              ? translateUi(copyLocale, "HmtPixView.pagamentoPIXConfirmado")
              : translateUi(copyLocale, "HmtPixView.pagamentoPIXProcessado")}
          </h3>
          <p className="mt-2 text-sm text-[var(--graphite)]/60">
            {formatHmtMoney(payment.amountInCents)}
          </p>
          <p className="mt-1 text-xs text-[var(--graphite)]/50">
            {translateUi(copyLocale, "HmtPixView.status")}
            {uiCopies[copyLocale.startsWith("pt") ? "pt" : "en"]
              .walletPaymentStatuses[
              payment.status as keyof typeof uiCopies.pt.walletPaymentStatuses
            ] ?? payment.status}
          </p>

          <div className="mt-6 flex justify-center">
            <Button onClick={onBack}>
              {translateUi(copyLocale, "HmtPixView.voltarParaACarteira")}
            </Button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onBack}
          aria-label={translateUi(copyLocale, "HmtPixView.back")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--restinga)]">
            {translateUi(copyLocale, "HmtPixView.carteira")}
          </p>
          <h2 className="font-serif text-2xl text-[var(--graphite)]">
            {translateUi(copyLocale, "HmtPixView.pagarPIX")}
          </h2>
        </div>
      </div>

      <section className="rounded-3xl border border-border bg-white/65 p-5">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[var(--mist)] text-[var(--ocean)]">
          <QrCode className="size-5" />
        </div>
        <h3 className="mt-4 font-semibold text-[var(--graphite)]">
          {translateUi(copyLocale, "HmtPixView.pIXCopiaECola")}
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--graphite)]/60">
          {translateUi(
            copyLocale,
            "HmtPixView.coleOCodigoPIXDaCobrancaOPagamentoSeraFeitoComOSaldoDisponivelDestaHMTWallet",
          )}
        </p>

        <div className="mt-5">
          <Label htmlFor="hmt-pix-code">
            {translateUi(copyLocale, "HmtPixView.codigoPIX")}
          </Label>
          <Textarea
            id="hmt-pix-code"
            className="mt-2 min-h-32 resize-y font-mono text-xs"
            value={pixCode}
            onChange={(event) => {
              setPixCode(event.target.value);
              setError(null);
            }}
            placeholder="000201..."
            autoComplete="off"
            disabled={isPaying}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={isPaying || !pixCode.trim()}>
                {isPaying && <Loader2 className="size-4 animate-spin" />}
                {translateUi(copyLocale, "HmtPixView.pagarPIX")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {translateUi(copyLocale, "HmtPixView.confirmarPagamentoPIX")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {translateUi(
                    copyLocale,
                    "HmtPixView.oValorDefinidoPelaCobrancaSeraDebitadoDoSaldoDisponivelDaSuaHMTWallet",
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {translateUi(copyLocale, "HmtPixView.back")}
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => void payPix()}>
                  {translateUi(copyLocale, "HmtPixView.confirmarPagamento")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="ghost" disabled={isPaying} onClick={onBack}>
            {translateUi(copyLocale, "HmtPixView.cancel")}
          </Button>
        </div>
      </section>
    </div>
  );
};
