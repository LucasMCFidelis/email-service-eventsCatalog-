# 📧 email-service · Catálogo de Eventos

Serviço de recuperação de senha (envio e validação de código por e-mail) do projeto *Catálogo de Eventos*, construído com **Fastify** + **TypeScript** + **Prisma**.

---

## 🧩 Estratégia de teste

O EmailService depende de dois pontos externos para funcionar: o **UserService** (para confirmar que o e-mail pertence a um usuário cadastrado) e um **provedor de envio de e-mail** real. Em vez de testar contra esses dois pontos de verdade, a pipeline sobe o **EmailService de verdade** — com banco de dados real via Postgres — e mocka apenas as duas dependências externas:

- **UserService** → mockado com **WireMock**.
- **Envio de e-mail** → mockado internamente via a flag `MOCK_EMAIL=true`, que faz o serviço logar o envio em vez de chamar o provedor real.

Isso garante:

- **Isolamento**: falhas do UserService ou do provedor de e-mail não derrubam o CI do EmailService.
- **Foco no que importa**: o que é validado é o contrato, a geração/persistência do código de recuperação (no Postgres) e a lógica de expiração — não os mocks.

Três repositórios sustentam essa estratégia:

| Repositório | Papel |
|---|---|
| **`email-service-eventsCatalog`** (este repo) | Serviço testado. |
| [`collectionTestApiEmailService`](https://github.com/LucasMCFidelis/collectionTestApiEmailService) | Collection Postman com os casos de teste de envio e validação de código, além dos testes smoke. |
| [`collectionTestApiUserService`](https://github.com/LucasMCFidelis/collectionTestApiUserService) | Mappings do WireMock que simulam o UserService por cenário — o mesmo mock reaproveitado pelo `auth-service`. |

O modo mock só é ativado com `MOCK_USER="true"` + header `x-mock-scenario` na requisição — fora disso, o header é ignorado e a chamada vai para a URL real. Ou seja, não há risco de mock "vazar" para produção.

---

## ⚙️ Pipelines de CI (GitHub Actions)

O serviço usa um workflow reutilizável, [`email-service-base.yml`](.github/workflows/email-service-base.yml), acionado por dois workflows diferentes conforme o objetivo do teste:

| Workflow | Gatilho | `NODE_ENV` | Pasta de testes | Environment |
|---|---|---|---|---|
| [`ci.yml`](.github/workflows/ci.yml) | push/PR em `main`/`develop` | `development` | `recovery` (fluxo completo) | `ci.environment.json` |
| [`security-smoke.yml`](.github/workflows/security-smoke.yml) | diariamente (cron) ou manual, só se houve commit nas últimas 24h | `production` | `security-smoke` | `production-like.environment.json` |

### Etapas do workflow base

1. Sobe um container **Postgres** de teste como *service* do job.
2. Checkout deste repositório, instala dependências (`npm ci`) e builda o serviço (`npm run build`).
3. Checkout dos repositórios de teste: `collectionTestApiEmailService` (em `api-tests/`) e `collectionTestApiUserService` (em `user-mock/`).
4. Roda as migrations do Prisma (`npx prisma migrate deploy`) contra o Postgres de teste.
5. Sobe o **WireMock** (porta `8089`) com os mappings do UserService mockado.
6. Sobe o **EmailService real**, com `MOCK_USER=true`, `MOCK_EMAIL=true` e apontando para o Postgres de teste e para o WireMock.
7. Instala o Newman (+ `newman-reporter-htmlextra`) e executa:
   - a pasta **`functional-smoke`** sempre, como sanity check;
   - a pasta indicada pelo workflow que chamou (`recovery` no CI, `security-smoke` no smoke diário), passando `emailSecurityTest` como variável vinda do secret `EMAIL_SECURITY_TEST` (usado apenas pelo teste de segurança).
8. Publica o relatório HTML do Newman como artifact (`relatorio-newman`).
9. No `ci.yml`, dispara o deploy (via `RENDER_DEPLOY_HOOK_URL`) após os testes passarem.

### Diagrama do fluxo

```
┌─────────────────────┐    x-mock-scenario     ┌───────────────────────┐
│   Newman (Postman)  │ ─────────────────────> │  EmailService (real)  │
│  collectionTestApi- │                        │  MOCK_USER=true       │
│    EmailService     │ <───────────────────── │  MOCK_EMAIL=true      │
└─────────────────────┘  200/400 + mensagem    └──────┬─────────┬──────┘
                                                      │         │
                             GET /users?userEmail=... │         │ INSERT/UPDATE
                             (com x-mock-scenario)    │         │ recovery_codes
                                                      ▼         ▼
                                      ┌──────────────────┐  ┌────────────┐
                                      │  WireMock (mock  │  │  Postgres  │
                                      │  do UserService) │  │  (teste)   │
                                      │  porta 8089      │  └────────────┘
                                      └──────────────────┘
```

### O que a pipeline garante
- Build sem erros.
- Migrations do Prisma aplicando corretamente contra um Postgres real.
- Rotas `/emails/send-recovery-code` e `/emails/validate-recovery-code` respondendo corretamente.
- Geração, persistência e validação real do código de recuperação no banco (não mockado — só a origem do e-mail do usuário e o envio de fato do e-mail são simulados).
- Regras de negócio e validação de payload cobrindo: envio válido, e-mail inválido, e-mail não cadastrado, campos obrigatórios ausentes, código inválido/expirado.
- O teste de segurança confirma que o `recoveryCode` **não** vaza no corpo da resposta quando `NODE_ENV=production`.
- Relatório navegável disponível como artifact, mesmo em caso de falha.

---

## 🚀 Reproduzindo os testes localmente

Esse passo a passo sobe o EmailService em **modo de desenvolvimento** (`npm run dev`), com um Postgres local, apontando para o UserService mockado (WireMock), e roda a collection de testes contra esse ambiente — usando o environment **`local-mock`**, equivalente ao `ci` mas pensado para execução manual na máquina do desenvolvedor.

### Pré-requisitos
- Node.js e npm
- Docker
- Newman (`npm install -g newman`)

### 1. Clone os três repositórios lado a lado

```bash
git clone https://github.com/LucasMCFidelis/email-service-eventsCatalog-.git
git clone https://github.com/LucasMCFidelis/collectionTestApiEmailService.git
git clone https://github.com/LucasMCFidelis/collectionTestApiUserService.git
```

Isso cria três pastas irmãs — os comandos abaixo assumem esse layout (ajuste os caminhos se organizar diferente).

### 2. Suba o Postgres de teste

```bash
docker run -d --name postgres-email-service -p 5432:5432 \
  -e POSTGRES_DB=email_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  postgres:15
```

### 3. Suba o UserService mockado (WireMock)

```bash
docker run -d --name wiremock-user-service -p 8089:8080 \
  -v "$(pwd)/collectionTestApiUserService/postman/wiremock:/home/wiremock" \
  wiremock/wiremock
```

Isso sobe o WireMock na porta `8089`, servindo os *mappings* de `collectionTestApiUserService/postman/wiremock/mappings` — cada arquivo representa um cenário (`SUCCESS_GET_USER`, usuário não encontrado, etc.), acionado pelo header `X-Mock-Scenario` enviado nas requisições de teste.

### 4. Instale as dependências do EmailService

```bash
cd email-service-eventsCatalog-
npm install
```

### 5. Configure o `.env` para apontar para os mocks

```bash
cp .env.example .env
```

No `.env` gerado, ajuste (ou confirme) as seguintes variáveis para que o serviço, em modo dev, use o Postgres local e o UserService mockado, sem enviar e-mails de verdade:

```env
DATABASE_URL_EMAIL=postgresql://test:test@localhost:5432/email_test
USER_SERVICE_URL_DEV=http://localhost:8089
MOCK_USER=true
MOCK_EMAIL=true
```

- `MOCK_USER=true` habilita o EmailService a repassar o header `x-mock-scenario` das requisições de teste para o UserService — sem essa flag, o header é ignorado.
- `MOCK_EMAIL=true` faz o serviço apenas logar o envio do e-mail, sem chamar o provedor real — necessário porque `MAIL_SERVER_ENDPOINT`/`API_MAIL_KEY` não são exigidos nesse modo.

### 6. Rode as migrations do Prisma

```bash
npx prisma migrate deploy
```

### 7. Suba o EmailService em modo dev

```bash
npm run dev
```

O `npm run dev` sobe o serviço com hot-reload (`tsx --watch`), lendo as variáveis do `.env`, disponível em `http://localhost:3000`. Deixe esse terminal aberto rodando o serviço.

### 8. Rode a collection com Newman, em outro terminal

```bash
cd collectionTestApiEmailService
newman run postman/collections/email-service.postman_collection.json \
  -e postman/environments/local-mock.environment.json \
  --folder functional-smoke

newman run postman/collections/email-service.postman_collection.json \
  -e postman/environments/local-mock.environment.json \
  --folder recovery
```

O `local-mock.environment.json` já vem configurado com `useMock=true`, `email_service_url=http://localhost:3000/emails` e `user_service_url=http://localhost:8089/users` — a mesma configuração usada no `ci.environment.json`, mas destinada à execução manual local em vez do pipeline de CI.

Se quiser rodar também a pasta `security-smoke`, ela depende da variável `emailSecurityTest` (não usada pela pasta `recovery`):

```bash
newman run postman/collections/email-service.postman_collection.json \
  -e postman/environments/local-mock.environment.json \
  --folder security-smoke \
  --env-var "emailSecurityTest=seu-email-de-teste@exemplo.com"
```

### 9. Encerre o ambiente

```bash
# Ctrl+C no terminal do EmailService
docker rm -f wiremock-user-service postgres-email-service
```

Detalhes de cada cenário de teste (envio, validação e smoke) estão documentados no README do repositório [`collectionTestApiEmailService`](https://github.com/LucasMCFidelis/collectionTestApiEmailService).

---

## 🔑 Variáveis de ambiente relevantes para os testes

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL_EMAIL` | ✔️ | String de conexão do Postgres usado para persistir os códigos de recuperação. |
| `NODE_ENV` | ✔️ | `development` ou `production` — define o sufixo de URL usado (`_DEV`/`_PROD`) e se o `recoveryCode` é exposto na resposta. |
| `USER_SERVICE_URL_DEV` | ✔️ (em CI e em dev com mock) | Aponta para o WireMock em testes. |
| `MOCK_USER` | opcional | `"true"` habilita o repasse do `x-mock-scenario` (só usado em teste/CI/dev com mock). |
| `MOCK_EMAIL` | opcional | `"true"` faz o serviço simular o envio do e-mail em vez de chamar o provedor real (só usado em teste/CI/dev com mock). |
| `MAIL_SERVER_ENDPOINT` / `API_MAIL_KEY` | obrigatórias fora do modo mock | Credenciais do provedor real de envio de e-mail. |