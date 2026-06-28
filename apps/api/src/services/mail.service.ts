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
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: (env.SMTP_PORT ?? 587) === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
  });

  await transporter.sendMail({
    from: env.SMTP_FROM ?? env.SMTP_USER,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html
  });
}
