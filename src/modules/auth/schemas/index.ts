import { z } from 'zod'

export const formLoginSchema = z.object({
    email: z.email({error: 'Ingrese un correo electrónico válido'}),
    password: z.string().min(1, {error: 'Ingrese una contraseña'}),
})