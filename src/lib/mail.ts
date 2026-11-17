import "server-only";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";
import { absoluteUrl } from "./utils";

let transporter: Transporter | null | undefined;

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  if (!process.env.SMTP_HOST) {
    transporter = null;
    return null;
  }
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT || 587) === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
  return transporter;
}

type MailInput = { to: string; subject: string; text: string; html?: string };

/**
 * Sends mail via SMTP when configured. Without SMTP credentials, mail is written
 * to storage/mail/outbox.log so local development stays fully testable.
 * Returns whether the message was actually handed to an SMTP server.
 */
export async function sendMail(input: MailInput): Promise<boolean> {
  const transport = getTransporter();
  if (!transport) {
    const dir = path.join(process.cwd(), "storage", "mail");
    await mkdir(dir, { recursive: true });
    const entry = [
      "=".repeat(72),
      `Date: ${new Date().toISOString()}`,
      `To: ${input.to}`,
      `Subject: ${input.subject}`,
      "",
      input.text,
      "",
    ].join("\n");
    await appendFile(path.join(dir, "outbox.log"), entry, "utf8");
    if (process.env.NODE_ENV !== "production") {
      console.info(`[mail:outbox] ${input.subject} -> ${input.to}\n${input.text}`);
    } else {
      console.warn("[mail] SMTP is not configured; message was written to the local outbox only.");
    }
    return false;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM || "Everlink <no-reply@everlink.local>",
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  return true;
}

export async function sendVerificationEmail(email: string, username: string, token: string) {
  const url = absoluteUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  return sendMail({
    to: email,
    subject: "Verify your Everlink email",
    text: `Hi @${username},\n\nWelcome to Everlink. Confirm your email address to unlock posting and messaging:\n\n${url}\n\nThis link expires in 24 hours. If you did not create this account, ignore this email.`,
  });
}

export async function sendPasswordResetEmail(email: string, username: string, token: string) {
  const url = absoluteUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  return sendMail({
    to: email,
    subject: "Reset your Everlink password",
    text: `Hi @${username},\n\nWe received a request to reset your Everlink password:\n\n${url}\n\nThis link expires in 1 hour. If you did not request this, your password is unchanged.`,
  });
}

export async function sendSecurityEmail(email: string, subject: string, message: string) {
  return sendMail({ to: email, subject: `Everlink security: ${subject}`, text: message });
}

export async function sendSignInCodeEmail(email: string, username: string, code: string) {
  return sendMail({
    to: email,
    subject: "Your Everlink sign-in code",
    text: `Hi @${username},\n\nYour Everlink sign-in code is:\n\n${code}\n\nIt expires in 10 minutes and can be used once. If you did not try to sign in, ignore this email and consider changing your password.`,
  });
}
