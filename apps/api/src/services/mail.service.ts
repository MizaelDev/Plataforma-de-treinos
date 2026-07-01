import { lookup } from "node:dns/promises";
import { env } from "../config/env.js";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

async function sendWithResend(input: MailInput) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.SMTP_FROM ?? "Ronivon Treinamentos <onboarding@resend.dev>",
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend falhou ao enviar e-mail: ${response.status} ${errorText}`);
  }
}

export async function sendMail(input: MailInput) {
  if (env.EMAIL_PROVIDER === "resend") {
    await sendWithResend(input);
    return;
  }

  if (!env.SMTP_HOST) {
    console.log("[email:dev]", {
      to: input.to,
      subject: input.subject,
      text: input.text
    });
    return;
  }

  const nodemailer = await import("nodemailer");
  const smtpAddress = await lookup(env.SMTP_HOST, { family: 4 });
  const transportOptions = {
    host: smtpAddress.address,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    tls: {
      servername: env.SMTP_HOST
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  };
  const transporter = nodemailer.createTransport(transportOptions as Parameters<typeof nodemailer.createTransport>[0]);

  await transporter.sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html
  });
}
