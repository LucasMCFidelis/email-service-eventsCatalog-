import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"], // Ponto de entrada
  outDir: "dist", // Diretório de saída
  format: ['cjs', 'esm'], // Formatos de saída (CommonJS e ES Module)
  clean: true, // Limpar a pasta 'dist' antes de gerar os arquivos
  dts: true, // Gera arquivos de tipos .d.ts
});
