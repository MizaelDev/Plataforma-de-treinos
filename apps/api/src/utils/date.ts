import { AppError } from "./errors.js";

export function parseDate(value: string | undefined, fieldLabel: string, required = true) {
  if (!value) {
    if (required) throw new AppError(400, `${fieldLabel} inválida.`);
    return null;
  }

  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new AppError(400, `${fieldLabel} inválida.`);
  }

  return date;
}
