import newman from "newman";
import fs from "fs";
import dotenv from "dotenv";

// Carrega variáveis do .env
dotenv.config();

const environment = process.env.NODE_ENV || "development";
const serviceUrl =
  environment === "production"
    ? process.env.EMAIL_SERVICE_URL_PROD
    : process.env.EMAIL_SERVICE_URL_DEV;

console.log(`[newman] Executando testes em ambiente ${environment}`);
console.log(`[newman] URL do serviço: ${serviceUrl}`);

// Carregando o arquivo JSON usando fs
const emailCollection = JSON.parse(
  fs.readFileSync("./src/tests/emailService.postman_collection.json", "utf-8")
);

newman.run(
  {
    collection: emailCollection,
    reporters: ["cli"],
    envVar: [
      {
        key: "email_service_url",
        value: serviceUrl,
      },
    ],
  },
  function (err) {
    if (err) {
      console.error("Erro ao rodar a collection:", err);
    } else {
      console.log("Collection executada com sucesso!");
    }
  }
);
