import { useWalletRuntime } from "../../runtime";
("use client");

import { translateUi } from "../../i18n";
import { useLocale as useCopyLocale } from "../../runtime";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Ban,
  Check,
  Copy,
  CreditCard,
  EyeOff,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  XCircle,
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
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  HMT_LIVE_CARD_BRANDS,
  HMT_LIVE_CARD_FUNDINGS,
  type HmtCreatedLiveCardResponse,
  type HmtLiveCardBrand,
  type HmtLiveCardDetailResponse,
  type HmtLiveCardFunding,
  type HmtLiveCardLifecycle,
  type HmtLiveCardResponse,
} from "../../types/hmt-live";
import { formatHmtCardNumber } from "../../utils/hmt-wallet.format";

type HmtCardsViewProps = {
  onBack: () => void;
};

export const HmtCardsView = ({ onBack }: HmtCardsViewProps) => {
  const {
    actionCreateHmtCard,
    actionGetHmtCard,
    actionListHmtCards,
    actionUpdateHmtCard,
  } = useWalletRuntime().operations;
  const copyLocale = useCopyLocale();
  const detailRef = useRef<HTMLElement | null>(null);
  const [cards, setCards] = useState<HmtLiveCardResponse[]>([]);
  const [brand, setBrand] = useState<HmtLiveCardBrand>("visa");
  const [funding, setFunding] = useState<HmtLiveCardFunding>("credit");
  const [showCreate, setShowCreate] = useState(false);
  const [createdCard, setCreatedCard] =
    useState<HmtCreatedLiveCardResponse | null>(null);
  const [selectedCard, setSelectedCard] =
    useState<HmtLiveCardDetailResponse | null>(null);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [loadingCardId, setLoadingCardId] = useState<string | null>(null);
  const [updatingCardId, setUpdatingCardId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await actionListHmtCards();
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setCards(result.data);
  }, []);

  useEffect(() => {
    void loadCards();
  }, [loadCards]);

  useEffect(() => {
    if (!createdCard && !selectedCard) return;

    window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [createdCard, selectedCard]);

  const createCard = async () => {
    if (isCreating) return;

    setIsCreating(true);
    setError(null);
    const result = await actionCreateHmtCard({
      brand,
      funding,
    });
    setIsCreating(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    // Keep the freshly created secrets in memory for the immediate reveal.
    // They can also be re-fetched later from the authenticated HMT card detail.
    setSelectedCard(null);
    setCopiedNumber(false);
    setCreatedCard(result.data);
    setBrand("visa");
    setFunding("credit");
    setShowCreate(false);
    await loadCards();
  };

  const copyCardNumber = async (number: string) => {
    try {
      await navigator.clipboard.writeText(number);
      setCopiedNumber(true);
      window.setTimeout(() => setCopiedNumber(false), 1_500);
    } catch {
      setError(
        translateUi(
          copyLocale,
          "HmtCardsView.naoFoiPossivelCopiarONumeroDoCartao",
        ),
      );
    }
  };

  const openCard = async (card: HmtLiveCardResponse) => {
    if (loadingCardId) return;

    setLoadingCardId(card.id);
    setError(null);
    setCopiedNumber(false);
    const result = await actionGetHmtCard(card.id);
    setLoadingCardId(null);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setCreatedCard(null);
    setSelectedCard(result.data);
  };

  const updateLifecycle = async (
    card: HmtLiveCardResponse,
    lifecycle: HmtLiveCardLifecycle,
  ) => {
    if (updatingCardId) return;

    setUpdatingCardId(card.id);
    setError(null);
    const result = await actionUpdateHmtCard(card.id, { lifecycle });
    setUpdatingCardId(null);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    setCards((current) =>
      current.map((item) => (item.id === result.data.id ? result.data : item)),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onBack}
            aria-label={translateUi(copyLocale, "HmtCardsView.back")}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--restinga)]">
              {translateUi(copyLocale, "HmtCardsView.carteira")}
            </p>
            <h2 className="font-serif text-2xl text-[var(--graphite)]">
              {translateUi(copyLocale, "HmtCardsView.cartoes")}
            </h2>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowCreate((current) => !current)}>
          <Plus className="size-4" />
          {translateUi(copyLocale, "HmtCardsView.novo")}
        </Button>
      </div>

      {createdCard && (
        <section
          ref={detailRef}
          className="rounded-3xl border border-border bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--wood)]">
                {translateUi(copyLocale, "HmtCardsView.exibicaoUnica")}
              </p>
              <h3 className="mt-1 font-serif text-xl text-[var(--graphite)]">
                {translateUi(copyLocale, "HmtCardsView.cartaoCriado")}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={translateUi(
                copyLocale,
                "HmtCardsView.ocultarDadosDoCartao",
              )}
              onClick={() => setCreatedCard(null)}
            >
              <EyeOff className="size-4" />
            </Button>
          </div>
          <div className="mt-5 rounded-2xl bg-[var(--graphite)] p-5 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-lg tracking-[0.12em]">
                {formatHmtCardNumber(createdCard.number)}
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="bg-white/10 text-white hover:bg-white/15 hover:text-white"
                onClick={() => void copyCardNumber(createdCard.number)}
              >
                {copiedNumber ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copiedNumber
                  ? translateUi(copyLocale, "walletCopy.copied")
                  : translateUi(copyLocale, "HmtCardsView.copiarNumero")}
              </Button>
            </div>
            <div className="mt-5 flex items-end justify-between gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/45">
                  {translateUi(copyLocale, "HmtCardsView.validUntil")}
                </p>
                <p className="mt-1 font-mono">
                  {String(createdCard.expirationMonth).padStart(2, "0")}/
                  {String(createdCard.expirationYear).slice(-2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/45">
                  {translateUi(copyLocale, "HmtCardsView.cVC")}
                </p>
                <p className="mt-1 font-mono">{createdCard.securityCode}</p>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs leading-5 text-[var(--graphite)]/55">
            {translateUi(
              copyLocale,
              "HmtCardsView.oNumeroEOCVCDesteCartaoDeTestePoderaoSerConsultadosNovamentePelaWalletPeloProprioPAYERAutentica",
            )}
          </p>
        </section>
      )}

      {selectedCard && (
        <section
          ref={detailRef}
          className="rounded-3xl border border-border bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--wood)]">
                {translateUi(copyLocale, "HmtCardsView.detalhesDoCartao")}
              </p>
              <h3 className="mt-1 font-serif text-xl text-[var(--graphite)]">
                {translateUi(copyLocale, `brandLabel.${selectedCard.brand}`)}{" "}
                •••• {selectedCard.last4}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={translateUi(
                copyLocale,
                "HmtCardsView.fecharDetalhesDoCartao",
              )}
              onClick={() => {
                setSelectedCard(null);
                setCopiedNumber(false);
              }}
            >
              <EyeOff className="size-4" />
            </Button>
          </div>

          <div className="mt-5 rounded-2xl bg-[var(--graphite)] p-5 text-white">
            {selectedCard.number ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-lg tracking-[0.12em]">
                  {formatHmtCardNumber(selectedCard.number)}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="bg-white/10 text-white hover:bg-white/15 hover:text-white"
                  onClick={() => void copyCardNumber(selectedCard.number!)}
                >
                  {copiedNumber ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  {copiedNumber
                    ? translateUi(copyLocale, "walletCopy.copied")
                    : translateUi(copyLocale, "HmtCardsView.copiarNumero")}
                </Button>
              </div>
            ) : (
              <div>
                <p className="font-mono text-lg tracking-[0.12em]">
                  •••• •••• •••• {selectedCard.last4}
                </p>
                <p className="mt-2 text-xs leading-5 text-white/55">
                  {translateUi(
                    copyLocale,
                    "HmtCardsView.numeroCompletoIndisponivelParaEsteCartaoLegado",
                  )}
                </p>
              </div>
            )}

            <div className="mt-5 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/45">
                  {translateUi(copyLocale, "HmtCardsView.validUntil")}
                </p>
                <p className="mt-1 font-mono">
                  {String(selectedCard.expirationMonth).padStart(2, "0")}/
                  {String(selectedCard.expirationYear).slice(-2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/45">
                  {translateUi(copyLocale, "HmtCardsView.cVC")}
                </p>
                <p className="mt-1 font-mono">
                  {selectedCard.securityCode ?? "•••"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-white/45">
                  {translateUi(copyLocale, "HmtCardsView.modalidade")}
                </p>
                <p className="mt-1">
                  {translateUi(
                    copyLocale,
                    `fundingLabel.${selectedCard.funding}`,
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {showCreate && (
        <section className="rounded-3xl border border-border bg-white/65 p-5">
          <h3 className="font-semibold text-[var(--graphite)]">
            {translateUi(copyLocale, "HmtCardsView.criarCartaoDeTeste")}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[var(--graphite)]/55">
            {translateUi(
              copyLocale,
              "HmtCardsView.selecioneABandeiraEAModalidadeAceitasPeloProvedorDeTestes",
            )}
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="hmt-card-brand">
                {translateUi(copyLocale, "HmtCardsView.bandeira")}
              </Label>
              <Select
                value={brand}
                disabled={isCreating}
                onValueChange={(value) => {
                  if (
                    (HMT_LIVE_CARD_BRANDS as readonly string[]).includes(value)
                  ) {
                    setBrand(value as HmtLiveCardBrand);
                  }
                }}
              >
                <SelectTrigger id="hmt-card-brand" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HMT_LIVE_CARD_BRANDS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {translateUi(copyLocale, `brandLabel.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="hmt-card-funding">
                {translateUi(copyLocale, "HmtCardsView.modalidade")}
              </Label>
              <Select
                value={funding}
                disabled={isCreating}
                onValueChange={(value) => {
                  if (
                    (HMT_LIVE_CARD_FUNDINGS as readonly string[]).includes(
                      value,
                    )
                  ) {
                    setFunding(value as HmtLiveCardFunding);
                  }
                }}
              >
                <SelectTrigger id="hmt-card-funding" className="mt-2 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HMT_LIVE_CARD_FUNDINGS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {translateUi(copyLocale, `fundingLabel.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button disabled={isCreating} onClick={() => void createCard()}>
                {isCreating && <Loader2 className="size-4 animate-spin" />}
                {translateUi(copyLocale, "HmtCardsView.criarCartao")}
              </Button>
              <Button
                variant="ghost"
                disabled={isCreating}
                onClick={() => setShowCreate(false)}
              >
                {translateUi(copyLocale, "HmtCardsView.cancel")}
              </Button>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {loading && (
        <div className="flex min-h-44 items-center justify-center text-[var(--graphite)]/60">
          <Loader2 className="mr-2 size-5 animate-spin motion-reduce:animate-none" />
          {translateUi(copyLocale, "HmtCardsView.carregandoCartoes")}
        </div>
      )}

      {!loading && cards.length === 0 && (
        <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-[var(--graphite)]/55">
          <CreditCard className="mx-auto mb-3 size-6" />
          <p className="text-sm">
            {translateUi(copyLocale, "HmtCardsView.nenhumCartaoDeTesteCriado")}
          </p>
        </div>
      )}

      {!loading && cards.length > 0 && (
        <div className="space-y-3">
          {cards.map((card) => {
            const updating = updatingCardId === card.id;
            return (
              <article
                key={card.id}
                className="rounded-3xl border border-border bg-white/65 p-5"
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-4 rounded-2xl text-left outline-none transition-colors hover:bg-white/60 focus-visible:ring-2 focus-visible:ring-[var(--champagne)]"
                  disabled={loadingCardId !== null}
                  onClick={() => void openCard(card)}
                  aria-label={translateUi(
                    copyLocale,
                    "HmtCardsView.verCartaoValue0FinalValue1",
                    {
                      value0: translateUi(
                        copyLocale,
                        `brandLabel.${card.brand}`,
                      ),
                      value1: card.last4,
                    },
                  )}
                >
                  <div className="min-w-0 p-2">
                    <div className="flex items-center gap-2">
                      {loadingCardId === card.id ? (
                        <Loader2 className="size-4 animate-spin text-[var(--ocean)]" />
                      ) : (
                        <CreditCard className="size-4 text-[var(--ocean)]" />
                      )}
                      <p className="truncate text-sm font-semibold text-[var(--graphite)]">
                        {translateUi(copyLocale, `brandLabel.${card.brand}`)}{" "}
                        •••• {card.last4}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-[var(--graphite)]/50">
                      {translateUi(copyLocale, `fundingLabel.${card.funding}`)}{" "}
                      · {String(card.expirationMonth).padStart(2, "0")}/
                      {String(card.expirationYear).slice(-2)}
                    </p>
                  </div>
                  <span className="m-2 shrink-0 rounded-full border border-border bg-[var(--off-white)] px-2.5 py-1 text-[11px] font-semibold text-[var(--graphite)]/65">
                    {translateUi(
                      copyLocale,
                      `lifecycleLabel.${card.lifecycle}`,
                    )}
                  </span>
                </button>

                <div className="mt-4 flex flex-wrap gap-2">
                  {card.lifecycle === "active" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updating}
                      onClick={() => void updateLifecycle(card, "blocked")}
                    >
                      {updating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Lock className="size-4" />
                      )}
                      {translateUi(copyLocale, "HmtCardsView.bloquear")}
                    </Button>
                  )}
                  {card.lifecycle === "blocked" && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={updating}
                      onClick={() => void updateLifecycle(card, "active")}
                    >
                      {updating ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RotateCcw className="size-4" />
                      )}
                      {translateUi(copyLocale, "HmtCardsView.reativar")}
                    </Button>
                  )}
                  {card.lifecycle !== "canceled" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" disabled={updating}>
                          <Ban className="size-4" />
                          {translateUi(
                            copyLocale,
                            "HmtCardsView.cancelarCartao",
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {translateUi(
                              copyLocale,
                              "HmtCardsView.cancelarEsteCartao",
                            )}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {translateUi(
                              copyLocale,
                              "HmtCardsView.oCancelamentoAlteraOLifecycleParaCanceledEETratadoComoUmaAcaoDestrutivaNestaWallet",
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {translateUi(copyLocale, "HmtCardsView.back")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() =>
                              void updateLifecycle(card, "canceled")
                            }
                          >
                            <XCircle className="size-4" />
                            {translateUi(
                              copyLocale,
                              "HmtCardsView.confirmCancellation",
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && cards.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => void loadCards()}>
          <RefreshCw className="size-4" />
          {translateUi(copyLocale, "HmtCardsView.atualizarCartoes")}
        </Button>
      )}
    </div>
  );
};
