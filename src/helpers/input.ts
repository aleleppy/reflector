export class ReflectorInput {
  password = `z
    .string()
    .regex(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
      message: 'A senha deve conter pelo menos ',
    })
    .min(8, { message: '8 caracteres, ' })
    .regex(/[A-Z]/, { message: 'uma letra maiúscula, ' })
    .regex(/[a-z]/, { message: 'uma letra minúscula, ' })
    .regex(/[0-9]/, { message: 'um número, ' })
    .regex(/[^A-Za-z0-9]/, { message: 'um caracter especial.' })
    .default('Senha123!@#')
  `;
}
