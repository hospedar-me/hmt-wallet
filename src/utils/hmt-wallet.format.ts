const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export const formatHmtMoney = (amountInCents: number) =>
  brlFormatter.format(amountInCents / 100);

export const formatHmtDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormatter.format(date);
};

export const formatHmtCardNumber = (value: string) =>
  value
    .replace(/\s+/g, "")
    .replace(/(.{4})/g, "$1 ")
    .trim();

export const parseHmtAmountInCents = (value: string): number | null => {
  const amount = Number(value.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
};
