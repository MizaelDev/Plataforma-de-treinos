import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { sendMail } from "./mail.service.js";
import { prisma } from "./prisma.js";

const RESET_TOKEN_EXPIRES_MINUTES = 60;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeResetToken(rawToken: string) {
  const trimmedToken = rawToken.trim();

  try {
    const parsedUrl = new URL(trimmedToken);
    const urlToken = parsedUrl.searchParams.get("token");
    if (urlToken) {
      return urlToken.trim().replace(/[.,;:)\]}]+$/g, "");
    }
  } catch {
    // The reset form usually sends only the raw token, not the full URL.
  }

  return trimmedToken.replace(/[.,;:)\]}]+$/g, "");
}

function addMinutes(date: Date, minutes: number) {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return nextDate;
}

function appBaseUrl() {
  return (env.PUBLIC_APP_URL ?? env.CORS_ORIGIN.split(",")[0] ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function sendPasswordResetLink(userId: string, reason: "reset" | "setup" = "reset") {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, isActive: true }
  });

  if (!user || !user.isActive) return false;

  const token = randomBytes(32).toString("hex");
  const expiresAt = addMinutes(new Date(), RESET_TOKEN_EXPIRES_MINUTES);

  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt
      }
    })
  ]);

  const resetUrl = `${appBaseUrl()}/reset-password?token=${token}`;
  const subject = reason === "setup" ? "Defina sua senha de acesso" : "Redefinição de senha";
  const actionText = reason === "setup" ? "definir sua senha" : "redefinir sua senha";
  const buttonText = reason === "setup" ? "Definir senha" : "Redefinir senha";
  const text = `Olá, ${user.name}.

Acesse o link para ${actionText}:
${resetUrl}

O link expira em ${RESET_TOKEN_EXPIRES_MINUTES} minutos.`;

  try {
    await sendMail({
      to: user.email,
      subject,
      text,
      html: `<p>Olá, ${user.name}.</p><p><a href="${resetUrl}">${buttonText}</a></p><p>O link expira em ${RESET_TOKEN_EXPIRES_MINUTES} minutos.</p>`
    });
    return true;
  } catch (error) {
    console.error("Falha ao enviar e-mail de redefinição de senha.", error);
    return false;
  }
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true }
  });

  if (user) {
    await sendPasswordResetLink(user.id, "reset");
  }
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashToken(normalizeResetToken(token));
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, isActive: true } } }
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date() || !resetToken.user.isActive) {
    throw new AppError(400, "Link inválido ou expirado. Solicite uma nova redefinição de senha.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash }
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() }
    })
  ]);
}
