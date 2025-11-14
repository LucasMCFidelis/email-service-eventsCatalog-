import { FastifyReply, FastifyRequest } from "fastify";
import { emailService } from "../services/recoveryCodeService.js";
import { handleError } from "../utils/handleError.js";
import { CodeValidationProps } from "../interfaces/CodeValidationProps.js";

export async function sendRecoveryCodeRoute(
  request: FastifyRequest<{ Body: { email: string } }>,
  reply: FastifyReply
) {
  const { email } = request.body;

  try {
    const response = await emailService.sendRecoveryCode(email);
    return reply.status(200).send({
      message: "Código de recuperação enviado para o seu e-mail",
      ...(process.env.NODE_ENV !== "production" && {
        recoveryCode: response.recoveryCode,
      }),
    });
  } catch (error) {
    return handleError(error, reply);
  }
}

export async function validateRecoveryCodeRoute(
  request: FastifyRequest<{ Body: CodeValidationProps }>,
  reply: FastifyReply
) {
  const { userEmail, recoveryCode } = request.body;

  try {
    await emailService.validateRecoveryCode({ userEmail, recoveryCode });
    return reply.status(200).send({
      message: "Código de recuperação válido",
    });
  } catch (error) {
    return handleError(error, reply);
  }
}
