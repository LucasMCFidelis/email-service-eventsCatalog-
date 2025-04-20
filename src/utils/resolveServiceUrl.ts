export function resolveServiceUrl(serviceName: string) {
  const environment = process.env.NODE_ENV;

  const suffix = environment === "production" ? "PROD" : "DEV";
  const key = `${serviceName}_SERVICE_URL_${suffix}`;
  const url = process.env[key];

  if (!url) {
    console.error(
      `A variável de ambiente "${key}" não está definida. Verifique se ela está presente no ambiente atual (NODE_ENV="${environment}").`
    );
  }

  return url;
}
