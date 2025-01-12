import { FastifyInstance } from "fastify";
import { sendRecoveryCodeController } from "../controllers/recoveryCodeController.js";

export async function recoveryCodeRoutes(fastify: FastifyInstance) {
  fastify.post("/recuperacao/enviar-codigo", sendRecoveryCodeController);
}
