import Fastify from "fastify";
import { recoveryCodeRoutes } from "./routes/recoveryCodeRoutes.js";
import cors from "@fastify/cors";
import configHeaders from "./plugin/configHeaders.js";

const server = Fastify();

// Configurar o CORS
server.register(cors, {
  origin: "*", // Libera totalmente para testes
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
});

// Registra Plugin de configuração de headers
server.register(configHeaders);

// Registrar rotas de usuários com prefixo
server.register(recoveryCodeRoutes, { prefix: "/emails" });

// Configurar a porta e host
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "localhost";

server
  .listen({ port: PORT, host: HOST })
  .then(() =>
    console.log(`
        Email service rodando em http://${HOST}:${PORT}/emails`)
  )
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
