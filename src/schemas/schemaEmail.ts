import Joi from "joi";

export const schemaEmail = Joi.object({
  email: Joi.string().email().required().messages({
    "any.required": "Email é obrigatório",
    "string.base": "Email deve ser uma string",
    "string.email": "Email deve ser um email válido",
    "string.empty": "Email não pode estar vazio",
  })
});
