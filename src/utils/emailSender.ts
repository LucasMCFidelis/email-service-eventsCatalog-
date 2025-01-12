import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";

export async function sendEmail(to: string, subject: string, html: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  } as SMTPTransport.Options);

  const mailOptions = { from: process.env.MAIL_USER, to, subject, html };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Erro ao enviar e-mail:", error);
    throw new Error("Erro ao enviar e-mail");
  }
}
