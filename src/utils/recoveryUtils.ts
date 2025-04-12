import { CodeValidationProps } from "../interfaces/CodeValidationProps.js";
import { prisma } from "./db/prisma.js";

export function generateRecoveryCode(length: number): string {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join("");
}

export function getExpiresAt(hours: number): Date {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + hours);
  return expiresAt;
}

export async function findRecoveryCode({
  userEmail,
  recoveryCode,
}: CodeValidationProps) {
  if (!recoveryCode) {
    throw {
      status: 400,
      error: "Erro de validação",
      message: "Recovery code é obrigatório",
    };
  }

  let code;
  try {
    code = prisma.recoveryCode.findFirst({
      where: {
        userEmail: userEmail.toLowerCase(),
        recoveryCode,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar o código no banco de dados", error);
    throw {
      status: 500,
      message: "Erro ao buscar o código no banco de dados",
      error: "Erro no servidor",
    };
  }
  
  return code;
}
