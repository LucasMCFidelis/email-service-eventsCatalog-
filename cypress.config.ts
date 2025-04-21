import { defineConfig } from "cypress";
import dotenvPlugin from "cypress-dotenv"
import { resolveServiceUrl } from "./src/utils/resolveServiceUrl";
import dotenv from "dotenv"

dotenv.config()

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      return dotenvPlugin(config);
    },
    baseUrl: resolveServiceUrl("EMAIL")
  },
  env:{
    USER_SERVICE_URL: resolveServiceUrl("USER"),
    USER_EMAIL_TEST: process.env.USER_EMAIL_TEST,
  }
});
