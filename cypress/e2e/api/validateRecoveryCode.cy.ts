describe("Validação de Recovery Code", () => {
  const userEmail = Cypress.env("USER_EMAIL_TEST")

  before(() => {
    cy.api("POST", "/send-recovery-code", {
      email: userEmail,
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property("recoveryCode");
      Cypress.env("recoveryCode", res.body.recoveryCode);
    });
  })

  it("com código inválido", () => {
    cy.api({
      method: "POST",
      url: "/validate-recovery-code",
      failOnStatusCode: false,
      body: {
        userEmail: userEmail,
        recoveryCode: "22dz",
      },
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body).to.have.property("message");
      expect(res.body.message).to.include("código de recuperação inválido");
    });
  });

  it("com email inválido", () => {
    cy.api({
      method: "POST",
      url: "/validate-recovery-code",
      failOnStatusCode: false,
      body: {
        userEmail: "lucasm2413il.com",
        recoveryCode: "F8Eiyo",
      },
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body).to.have.property("message");
      expect(res.body.message.toLowerCase()).to.include(
        "email deve ser um email válido"
      );
    });
  });

  it("sem passar email", () => {
    cy.api({
      method: "POST",
      url: "/validate-recovery-code",
      failOnStatusCode: false,
      body: {
        recoveryCode: "220Sdz",
      },
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body).to.have.property("message");
      expect(res.body.message.toLowerCase()).to.include("email é obrigatório");
    });
  });

  it("sem passar código", () => {
    cy.api({
      method: "POST",
      url: "/validate-recovery-code",
      failOnStatusCode: false,
      body: {
        userEmail: userEmail,
      },
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body).to.have.property("message");
      expect(res.body.message.toLowerCase()).to.include(
        "recovery code é obrigatório"
      );
    });
  });

  it("com email não cadastrado", () => {
    cy.api({
      method: "POST",
      url: "/validate-recovery-code",
      body: {
        userEmail: "fidelis.lucas.nao.cadastrado@gmail.com",
        recoveryCode: "220Sdz",
      },
      failOnStatusCode: false,
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body).to.have.property("message");
      expect(res.body.message.toLowerCase()).to.include(
        "código de recuperação inválido"
      );
    });
  });

  it("com código válido", () => {
    cy.api("POST", "/validate-recovery-code", {
      userEmail: userEmail,
      recoveryCode: Cypress.env("recoveryCode"),
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property("message");
      expect(res.body.message).to.include("Código de recuperação válido");
    });
  });
});
