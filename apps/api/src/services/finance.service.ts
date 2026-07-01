import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

const money = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value).toDecimalPlaces(2);

export async function getFinancialSettings(organizationId: string) {
  return (
    (await prisma.financialSettings.findUnique({ where: { organizationId } })) ??
    (await prisma.financialSettings.create({ data: { organizationId } }))
  );
}

export function calculateInvoiceChargesWithSettings(
  settings: Awaited<ReturnType<typeof getFinancialSettings>>,
  dueDate: Date,
  amount: Prisma.Decimal.Value
) {
  const today = new Date();
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const normalizedDueDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const overdueDays = Math.max(
    0,
    Math.floor((normalizedToday.getTime() - normalizedDueDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  if (overdueDays === 0) {
    return { fineAmount: money(0), interestAmount: money(0), total: money(amount), overdueDays };
  }

  const base = new Prisma.Decimal(amount);
  const fineAmount = base.mul(settings.fixedFinePercentage).div(100);
  const dailyInterestAmount = base.mul(settings.dailyInterestPercentage).div(100).mul(overdueDays);
  const monthlyInterestAmount = base.mul(settings.monthlyInterestPercentage).div(100).mul(overdueDays).div(30);
  const interestAmount = dailyInterestAmount.add(monthlyInterestAmount);
  const total = base.add(fineAmount).add(interestAmount);

  return {
    fineAmount: money(fineAmount),
    interestAmount: money(interestAmount),
    dailyInterestAmount: money(dailyInterestAmount),
    monthlyInterestAmount: money(monthlyInterestAmount),
    total: money(total),
    overdueDays
  };
}

export async function calculateInvoiceCharges(organizationId: string, dueDate: Date, amount: Prisma.Decimal.Value) {
  const settings = await getFinancialSettings(organizationId);
  return calculateInvoiceChargesWithSettings(settings, dueDate, amount);
}
