import axios from "axios";
import { handleAxiosError } from "./handleAxiosError.js";

export async function sendEmail(to: string, subject: string, html: string) {
  const MAIL_SERVER_ENDPOINT = process.env.MAIL_SERVER_ENDPOINT;
  const API_MAIL_KEY = process.env.API_MAIL_KEY;

  if (!MAIL_SERVER_ENDPOINT || !API_MAIL_KEY) {
    throw new Error("API_MAIL_KEY or MAIL_SERVER_ENDPOINT not found");
  }

  try {
    await axios.post(
      MAIL_SERVER_ENDPOINT,
      {
        to,
        subject,
        html,
      },
      {
        headers: {
          Authorization: `Bearer ${API_MAIL_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    handleAxiosError(error);
  }
}
