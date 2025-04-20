import axios from "axios";

export function handleAxiosError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.message || "Erro de comunicação axios";

    throw {
      status: statusCode,
      message: errorMessage,
      error: "Erro  inesperado",
    };
  }
}
