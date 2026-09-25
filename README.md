# 📧 email-service · Catálogo de Eventos

Serviço de recuperação de senha (envio e validação de código por e-mail) do projeto *Catálogo de Eventos*, construído com **Fastify** + **TypeScript** + **Prisma**.

---

## 🧩 Estratégia de teste

O EmailService depende de dois pontos externos para funcionar: o **UserService** (para confirmar que o e-mail pertence a um usuário cadastrado) e um **provedor de envio de e-mail** real. Em vez de testar contra esses dois pontos de verdade, a pipeline sobe o **EmailService de verdade** — com banco de dados real via Postgres, tudo orquestrado pelo [`docker-compose.yml`](docker-compose.yml) — e mocka apenas as duas dependências externas:

- **UserService** → mockado pelo serviço `user-service-mock` (WireMock, buildado do repositório de testes).
- **Envio de e-mail** → mockado internamente via a flag `MOCK_EMAIL=true`, que faz o serviço logar o envio em vez de chamar o provedor real.

Isso garante:

- **Isolamento**: falhas do UserService ou do provedor de e-mail não derrubam o CI do EmailService.
- **Foco no que importa**: o que é validado é o contrato, a geração/persistência do código de recuperação (no Postgres) e a lógica de expiração — não os mocks.

A estratégia usa dois profiles do Compose:

- **`test`**: fluxo funcional completo, com o EmailService rodando em modo `development` (`recoveryCode` visível na resposta — útil para depurar o fluxo).
- **`like-prod`**: simula um ambiente de **produção** de verdade (`NODE_ENV=production`), usado para o *smoke de segurança* que garante que o `recoveryCode` **não** é exposto no corpo da resposta nesse modo — o resto do ambiente (banco, mock do UserService) é o mesmo do profile `test`.

Três repositórios sustentam essa estratégia:

| Repositório | Papel |
|---|---|
| **`email-service-eventsCatalog`** (este repo) | Serviço testado. |
| [`collectionTestApiEmailService`](https://github.com/LucasMCFidelis/collectionTestApiEmailService) | Collection Postman com os casos de teste de envio e validação de código, além dos testes smoke. |
| [`collectionTestApiUserService`](https://github.com/LucasMCFidelis/collectionTestApiUserService) | Mappings do WireMock que simulam o UserService por cenário — o mesmo mock reaproveitado pelo `auth-service`. |

O modo mock só é ativado com `MOCK_USER="true"` + header `x-mock-scenario` na requisição — fora disso, o header é ignorado e a chamada vai para a URL real. Ou seja, não há risco de mock "vazar" para produção.

---

## ⚙️ Pipeline de CI

Workflow: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — roda em push/PR para `main`/`develop`.

Assim como no `auth-service`, toda a orquestração dos testes foi movida para o [`docker-compose.yml`](docker-compose.yml). Aqui ela é dividida em **dois profiles**, executados como jobs separados na mesma pipeline:

| Job | Profile | Comando | `START_SCRIPT` → `NODE_ENV` | `recoveryCode` na resposta? |
|---|---|---|---|---|
| `test` | `test` | `docker compose --profile test up --build --exit-code-from tests-functional` | `start:dev` → `development` (padrão) | ✔️ sim |
| `security-smoke` | `like-prod` | `docker compose --profile like-prod up --build --exit-code-from tests-security` | `start` → `production` (forçado via env) | ❌ não — é isso que o teste valida |

`db`, `migrate`, `app` e `user-service-mock` pertencem **aos dois profiles** — é literalmente o mesmo ambiente nos dois casos, só muda o `START_SCRIPT` do serviço `app` (que decide o `NODE_ENV`, já que o `cross-env` fixa esse valor dentro do próprio script do `package.json` — um `NODE_ENV` passado por fora não tem efeito) e qual runner de teste sobe ao final. Isso é o que permite ao `like-prod` simular um ambiente de produção de verdade — com `recoveryCode` oculto da resposta, exatamente como aconteceria em produção — sem precisar de uma segunda definição de ambiente.

### Etapas de cada job

1. Checkout deste repositório.
2. Sobe o ambiente via Compose, que builda e orquestra:
   - **`db`**: Postgres de teste (efêmero, `tmpfs`).
   - **`migrate`**: roda `prisma migrate deploy` contra o `db` e encerra (`service_completed_successfully`).
   - **`app`**: o EmailService real (mesmo `Dockerfile` de produção, estágio `prod`), com `MOCK_USER=true` e `MOCK_EMAIL=true` sempre ligados — só o `START_SCRIPT` muda entre os dois jobs.
   - **`user-service-mock`**: builda direto do repositório [`collectionTestApiUserService`](https://github.com/LucasMCFidelis/collectionTestApiUserService) (mesmo mock reaproveitado pelo `auth-service`), exposto na rede como `user-service`.
   - **`tests-functional`** (job `test`) ou **`tests-security`** (job `security-smoke`): builda direto do repositório [`collectionTestApiEmailService`](https://github.com/LucasMCFidelis/collectionTestApiEmailService), rodando a collection com Newman contra o `app` assim que ele fica *healthy*.
     - `tests-functional` roda as pastas `functional-smoke` + `recovery`.
     - `tests-security` roda a pasta `security-smoke`, passando `emailSecurityTest` (vindo do secret `EMAIL_SECURITY_TEST`) como variável do Newman.
3. `--exit-code-from tests-*` propaga o resultado da collection como código de saída do comando.
4. Em caso de falha, salva os logs do Compose como artifact.
5. Publica o relatório HTML do Newman como artifact (`relatorio-newman-functional` / `relatorio-newman-security`), mesmo em caso de falha.
6. Para e remove containers/volumes (`docker compose --profile <profile> down -v`).
7. O job `deploy` roda só depois que **`test` e `security-smoke` passam**, em push para `main`, disparando o deploy via `RENDER_DEPLOY_HOOK_URL`.

### Diagrama do fluxo

```
docker compose --profile test up --build --exit-code-from tests-functional
docker compose --profile like-prod up --build --exit-code-from tests-security  (START_SCRIPT=start)

┌──────────────────────────┐  x-mock-scenario   ┌────────────────────────────┐
│  tests-functional /      │───────────────────>│  app                       │
│  tests-security (Newman) │                    │  (EmailService real)       │
│  build: repo             │<───────────────────│  MOCK_USER=true            │
│  collectionTestApi-      │  200/400 + msg     │  MOCK_EMAIL=true           │
│  EmailService            │  (sem recoveryCode │  START_SCRIPT: start[:dev] │
│  depends_on: app         │   se like-prod)    └───────┬───────────┬────────┘
│  (service_healthy)       │                            │           │
└──────────────────────────┘    GET /users?userEmail=...│           │ INSERT/UPDATE
                                 (com x-mock-scenario)  │           | recovery_codes
                                                        ▼           ▼
                                  ┌─────────────────────────┐    ┌───────────┐
                                  │  user-service-mock      │    │  db       │
                                  │  build: repo            │    │ (Postgres,│
                                  │  collectionTestApiUser- │    │  tmpfs)   │
                                  │  Service (WireMock)     │    └───────────┘
                                  │  alias: user-service    │
                                  └─────────────────────────┘
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

Esse ambiente é o mesmo usado na CI, orquestrado pelo [`docker-compose.yml`](docker-compose.yml) através de dois profiles: `test` (fluxo funcional completo) e `like-prod` (smoke de segurança, simulando produção). Não é mais necessário clonar os repositórios de teste manualmente, nem instalar Postgres/Newman/WireMock na máquina — o Compose builda tudo (EmailService real, mock do UserService e o runner do Newman) a partir das imagens/contextos definidos no arquivo.

### Pré-requisitos
- Docker + Docker Compose

### 1. Clone este repositório

```bash
git clone https://github.com/LucasMCFidelis/email-service-eventsCatalog-.git
cd email-service-eventsCatalog-
```

### 2. (Opcional) Copie o `.env.example` para `.env`

```bash
cp .env.example .env
```

Nada aqui é obrigatório para o `docker compose`: `DATABASE_URL_EMAIL`, `USER_SERVICE_URL_DEV`/`_PROD`, `MOCK_USER` e `MOCK_EMAIL` já vêm fixados no `docker-compose.yml` para o ambiente de teste. O `.env` só é útil para:

```env
# Caminho para os repositórios de teste (opcional — só para usar versões locais em vez de puxar do GitHub)
USER_MOCK_GIT=../collectionTestApiUserService
API_TESTS_GIT=../collectionTestApiEmailService

# Obrigatória apenas se for rodar o profile like-prod (teste de segurança)
EMAIL_SECURITY_TEST=seu-email-de-teste@exemplo.com
```

### 3. Rode o profile `test` (fluxo funcional completo)

```bash
docker compose --profile test up --build --exit-code-from tests-functional
```

Builda e sobe, na ordem certa: `db` (Postgres efêmero) → `migrate` (`prisma migrate deploy`) → `app` (EmailService real, `START_SCRIPT=start:dev` → `NODE_ENV=development`, `MOCK_USER=true`, `MOCK_EMAIL=true`) e `user-service-mock` (buildado do repositório [`collectionTestApiUserService`](https://github.com/LucasMCFidelis/collectionTestApiUserService)) → `tests-functional` (buildado do repositório [`collectionTestApiEmailService`](https://github.com/LucasMCFidelis/collectionTestApiEmailService)), que roda as pastas `functional-smoke` + `recovery` contra o `app` assim que ele fica saudável. Nesse modo o `recoveryCode` **aparece** na resposta (útil para inspecionar o fluxo manualmente).

`--exit-code-from tests-functional` faz o comando terminar com o código de saída da collection.

### 4. Rode o profile `like-prod` (smoke de segurança, simulando produção)

```bash
START_SCRIPT=start docker compose --profile like-prod up --build --exit-code-from tests-security
```

No **PowerShell (Windows)**:
```powershell
$env:START_SCRIPT = "start"
docker compose --profile like-prod up --build --exit-code-from tests-security
```

`db`, `migrate`, `app` e `user-service-mock` são exatamente os mesmos serviços do profile `test` (ambos os profiles compartilham essas definições no Compose) — o que muda é só o `START_SCRIPT` do `app`, que passa a ser `start` em vez de `start:dev`. Isso força `NODE_ENV=production` dentro do serviço (o `cross-env` fixa esse valor no próprio script do `package.json`, então um `NODE_ENV` passado por fora não teria efeito), e é exatamente essa mudança que faz o EmailService parar de incluir o `recoveryCode` no corpo da resposta — simulando o comportamento real de produção. O runner que sobe ao final é o `tests-security`, rodando só a pasta `security-smoke`, que valida justamente essa ausência do `recoveryCode` na resposta; ele espera a variável `emailSecurityTest` (defina `EMAIL_SECURITY_TEST` no `.env` ou exporte antes do comando).

### 5. Veja os relatórios

Os relatórios HTML do Newman são gerados em `./reports/functional.html` (profile `test`) e `./reports/security.html` (profile `like-prod`), montados como volume pelos serviços `tests-functional`/`tests-security`, e podem ser abertos direto no navegador.

### 6. Encerre e limpe o ambiente

```bash
docker compose --profile test --profile like-prod down -v
```

Detalhes de cada cenário de teste (envio, validação e smoke) estão documentados no README do repositório [`collectionTestApiEmailService`](https://github.com/LucasMCFidelis/collectionTestApiEmailService).

---

## 🔑 Variáveis de ambiente relevantes para os testes

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL_EMAIL` | ✔️ | String de conexão do Postgres usado para persistir os códigos de recuperação. |
| `START_SCRIPT` | opcional (Docker) | `start:dev` (padrão, `NODE_ENV=development`) ou `start` (`NODE_ENV=production`). Decide qual script do `package.json` roda — e é esse script, via `cross-env`, quem fixa o `NODE_ENV`; um `NODE_ENV` passado por fora não tem efeito. |
| `NODE_ENV` | ✔️ (fixado pelo script, não por fora) | `development` ou `production` — define o sufixo de URL usado (`_DEV`/`_PROD`) e se o `recoveryCode` é exposto na resposta. |
| `USER_SERVICE_URL_DEV` / `USER_SERVICE_URL_PROD` | ✔️ (em CI e em dev com mock) | Aponta para o mock (WireMock/`user-service-mock`) em testes. |
| `MOCK_USER` | opcional | `"true"` habilita o repasse do `x-mock-scenario` (só usado em teste/CI/dev com mock). |
| `MOCK_EMAIL` | opcional | `"true"` faz o serviço simular o envio do e-mail em vez de chamar o provedor real (só usado em teste/CI/dev com mock). |
| `MAIL_SERVER_ENDPOINT` / `API_MAIL_KEY` | obrigatórias fora do modo mock | Credenciais do provedor real de envio de e-mail. |
| `EMAIL_SECURITY_TEST` | ✔️ (só para o profile `like-prod`) | E-mail de teste passado ao Newman (`emailSecurityTest`) para o teste de segurança. |