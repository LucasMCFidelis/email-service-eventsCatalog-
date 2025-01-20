import { FastifyInstance } from "fastify";
import { sendRecoveryCodeRoute, validateRecoveryCodeRoute } from "../controllers/recoveryCodeController.js";

export async function recoveryCodeRoutes(fastify: FastifyInstance) {
  fastify.post("/send-recovery-code", sendRecoveryCodeRoute);
  fastify.post("/validate-recovery-code", validateRecoveryCodeRoute);
}
