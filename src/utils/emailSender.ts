import { Resend } from "resend";

export async function sendEmail(to: string, subject: string, html: string) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const MAIL_USER = process.env.MAIL_USER;

  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not found");
  }
  if (!MAIL_USER) {
    throw new Error("MAIL_USER not found");
  }

  const resend = new Resend(RESEND_API_KEY);

  return await resend.emails.send({
    from: MAIL_USER,
    to: [to],
    subject,
    html,
  });
}
