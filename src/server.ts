import Fastify from "fastify";
import { recoveryCodeRoutes } from "./routes/recoveryCodeRoutes.js";

const server = Fastify();

// Registrar rotas de usuários com prefixo
server.register(recoveryCodeRoutes, { prefix: "/email" });

// Configurar a porta e host
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "localhost";

server
  .listen({ port: PORT, host: HOST })
  .then(() =>
    console.log(`
        Email service rodando em http://${HOST}:${PORT}`)
  )
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
