import nodemailer from "nodemailer";
import { ServiceError } from "./errors.js";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SMTP_HOST,
  port: process.env.EMAIL_SMTP_PORT,
  auth: {
    user: process.env.EMAIL_SMTP_USER,
    pass: process.env.EMAIL_SMTP_PASSWORD,
  },
  // TLS implícito só na 465; nas demais portas (ex.: 587) o nodemailer usa STARTTLS.
  secure: Number(process.env.EMAIL_SMTP_PORT) === 465,
  // Sem isso o nodemailer espera 2 minutos quando o SMTP não responde, e um
  // comentário de teste fica preso até esse prazo.
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
});

async function send(mailOptions) {
  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    throw new ServiceError({
      message: "Não foi possível enviar o e-mail.",
      action: "Verifique se o serviço de e-mail está disponível.",
      cause: error,
      context: mailOptions,
    });
  }
}

const email = {
  send,
};

export default email;
