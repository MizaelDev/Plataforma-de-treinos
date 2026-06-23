export function formatCpf(value: string) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }

  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}

export function normalizeMoneyInput(value: string) {
  return value.replace(/[^\d,.]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "");
}

export function formatCurrency(value: string | number) {
  return Number(value ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function formatDecimal(value?: string | number | null, suffix = "") {
  if (value === undefined || value === null || value === "") return "-";
  return `${String(value).replace(".", ",")}${suffix}`;
}

export function invoiceDisplayAmount(invoice: {
  status?: string;
  amount: string | number;
  totalPaid?: string | number | null;
  charges?: { total?: string | number | null } | null;
}) {
  const totalPaid = Number(invoice.totalPaid ?? 0);

  if (invoice.status === "PAGO") {
    return totalPaid > 0 ? invoice.totalPaid ?? invoice.amount : invoice.amount;
  }

  return invoice.charges?.total ?? invoice.amount;
}
