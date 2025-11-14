import {
  findRecoveryCode,
  generateRecoveryCode,
  getExpiresAt,
} from "../utils/recoveryUtils.js";
import { sendEmail } from "../utils/emailSender.js";
import { prisma } from "../utils/db/prisma.js";
import { CodeValidationProps } from "../interfaces/CodeValidationProps.js";
import { schemaEmail } from "../schemas/schemaEmail.js";
import axios from "axios";
import { resolveServiceUrl } from "../utils/resolveServiceUrl.js";
import { handleAxiosError } from "../utils/handleAxiosError.js";

const userServiceUrl = resolveServiceUrl("USER");
console.log(userServiceUrl);

async function sendRecoveryCode(email: string) {
  email.toLowerCase();
  await schemaEmail.validateAsync({ email });

  try {
    await axios.get(`${userServiceUrl}/users?userEmail=${email}`);
  } catch (error) {
    handleAxiosError(error);
  }

  const recoveryCode = generateRecoveryCode(6);
  const expiresAt = getExpiresAt(1); // 1 hora de validade

  try {
    // Atualiza o usuário no banco de dados
    await prisma.recoveryCode.upsert({
      where: { userEmail: email },
      update: { recoveryCode, expiresAt },
      create: { userEmail: email, recoveryCode, expiresAt },
    });
  } catch (error) {
    console.error("Erro ao salvar o código no banco de dados", error);
    throw {
      status: 500,
      message: "Erro ao salvar o código no banco de dados",
      error: "Erro no servidor",
    };
  }

  const emailSubject = "Código de Recuperação de Senha";
  const emailBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p style="font-size: 18px;">Olá,</p>
          <p style="font-size: 16px;">Recebemos uma solicitação para a recuperação da sua senha. Para continuar, por favor, utilize o código abaixo:</p>
          <div style="background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; font-size: 20px; font-weight: bold; color: #2c3e50;">
              ${recoveryCode}
          </div>
          <p style="font-size: 16px; margin-top: 10px;">⚠️ Lembre-se: Este código é válido por apenas <strong>1 hora</strong>. Após esse período, você precisará solicitar um novo código.</p>
          <p style="font-size: 16px;">Se você não solicitou a recuperação de senha, desconsidere este e-mail.</p>
          <p style="font-size: 16px;">Estamos aqui para ajudar! Se tiver alguma dúvida, não hesite em nos contatar.</p>
          <p style="font-size: 16px; font-weight: bold;">Atenciosamente,</p>
          <p style="font-size: 16px;">Equipe de Suporte do Sistema</p>
      </div>
    `;

  try {
    await sendEmail(email, emailSubject, emailBody);
  } catch (error) {
    console.error("Erro ao enviar email", error);
    throw {
      status: 500,
      message: "Não foi possível enviar o email",
    };
  }

  return {
    status: 200,
    error: false,
    ...(process.env.NODE_ENV !== "production" && { recoveryCode }),
  };
}

async function validateRecoveryCode({
  userEmail,
  recoveryCode,
}: CodeValidationProps) {
  userEmail.toLowerCase();
  await schemaEmail.validateAsync({ email: userEmail });

  const recoveryRecord = await findRecoveryCode({ userEmail, recoveryCode });

  if (!recoveryRecord || recoveryCode !== recoveryRecord.recoveryCode) {
    throw {
      status: 400,
      error: "Erro de validação",
      message: "Código de recuperação inválido",
    };
  }

  // Verificar se o código expirou
  const currentTime = new Date();
  if (currentTime > new Date(recoveryRecord.expiresAt)) {
    throw {
      status: 400,
      error: "Erro de validação",
      message: "Código de recuperação expirado",
    };
  }
}

export const emailService = {
  sendRecoveryCode,
  validateRecoveryCode,
};
