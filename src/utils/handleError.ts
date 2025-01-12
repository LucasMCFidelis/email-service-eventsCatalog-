import { FastifyReply } from "fastify";

export function handleError(error: unknown, reply: FastifyReply) {
    // Verifica se o erro é uma instância de Error
    if (error instanceof Error) {
        console.error(error.message);
        return reply.status(400).send({
            error: 'Erro de validação',
            message: error.message.toLowerCase(),
        });
    }

    // Para erros não previstos ou que não sejam do tipo Error
    if (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        'error' in error &&
        'message' in error
    ) {
        const { status, error: errorType, message } = error as { status: number; error: string; message: string };
        console.error('Erro conhecido:', error);
        return reply.status(status).send({
            error: errorType,
            message,
        });
    }

    // Caso o erro não seja tratável ou tenha uma estrutura desconhecida
    console.error('Erro desconhecido:', error);
    return reply.status(500).send({
        error: 'Erro no servidor',
        message: 'Erro interno ao realizar operação',
    });
}
