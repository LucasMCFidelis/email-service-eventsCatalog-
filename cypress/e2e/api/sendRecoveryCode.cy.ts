describe("Email Service", () => {
  it("Enviar recovery code com sucesso", () => {
    cy.api("POST", "/send-recovery-code", {
      email: "lucasm241301@gmail.com",
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property("recoveryCode");
      Cypress.env("recoveryCode", res.body.recoveryCode);
    });
  });

  it("Enviar recovery code para email inválido", () => {
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

  it("Enviar recovery code para email não cadastrado", () => {
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

  it("Enviar recovery code sem passar o email", () => {
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
