import { FastifyReply, FastifyRequest } from "fastify";
import { emailService } from "../services/recoveryCodeService.js";
import { handleError } from "../utils/handleError.js";


export async function sendRecoveryCodeController(
  request: FastifyRequest<{
    Body: { email: string };
  }>,
  reply: FastifyReply
) {
  const { email } = request.body;

  try {
    await emailService.sendRecoveryCodeService(email);
    return reply.status(200).send({
      message: "Código de recuperação enviado para o seu e-mail",
    });
  } catch (error) {
    return handleError(error, reply);
  }
}
