describe("Enviar recovery code", () => {
  const userEmail = Cypress.env("USER_EMAIL_TEST")

  it("com sucesso", () => {
    cy.api("POST", "/send-recovery-code", {
      email: userEmail,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property("recoveryCode");
      Cypress.env("recoveryCode", res.body.recoveryCode);
    });
  });

  it("para email inválido", () => {
    cy.api({
      method: "POST",
      url: "/send-recovery-code",
      failOnStatusCode: false,
      body: { email: "lucasm241301@.com" },
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body).to.have.property("message");
      expect(res.body.message.toLowerCase()).to.include(
        "email deve ser um email válido"
      );
    });
  });

  it("para email não cadastrado", () => {
    cy.api({
      method: "POST",
      url: "/send-recovery-code",
      body: {
        email: "fidelis.lucas.nao.cadastrado@gmail.com",
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(404);
      expect(res.body).to.have.property("message");
      expect(res.body.message.toLowerCase()).to.include(
        "usuário não encontrado"
      );
    });
  });

  it("sem passar o email", () => {
    cy.api({
      method: "POST",
      url: "/send-recovery-code",
      failOnStatusCode: false,
      body: {},
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body).to.have.property("message");
      expect(res.body.message.toLowerCase()).to.include("email é obrigatório");
    });
  });
});
