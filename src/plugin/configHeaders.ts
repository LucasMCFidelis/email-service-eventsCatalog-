import fp from "fastify-plugin";
import { FastifyInstance } from "fastify";

export default fp(async function (server: FastifyInstance) {
  server.addHook("onSend", async (request, reply, payload) => {
    reply.header(
      "email-service-environment",
      process.env.NODE_ENV || "development"
    );
    return payload;
  });
});
