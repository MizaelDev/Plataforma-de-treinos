import { lookup } from "node:dns/promises";
import { env } from "../config/env.js";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendMail(input: MailInput) {
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
