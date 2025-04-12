import newman from "newman";
import fs from "fs";

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
        value: "https://email-service-eventscatalog.onrender.com/emails",
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
