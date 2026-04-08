import { z } from "zod";

/**
 * Esquema de validación para crear/editar categorías
 */
export const categoryFormSchema = z.object({
  name: z
    .string()
    .min(1, { message: "El nombre es requerido" })
    .max(100, { message: "El nombre no puede exceder 100 caracteres" }),

  description: z
    .string()
    .max(500, { message: "La descripción no puede exceder 500 caracteres" })
    .optional(),

  parent_id: z
    .string()
    .optional()
    .or(z.literal(""))
    .or(z.literal("none")), // Permitir 'none' para "sin padre"

  deleted_at: z
    .string()
    .datetime({ message: "Fecha de eliminación inválida" })
    .optional()
    .nullable(),

  sort_order: z
    .number()
    .int({ message: "El orden debe ser un número entero" })
    .min(0, { message: "El orden debe ser mayor o igual a 0" })
    .default(0),

  icon: z
    .string()
    .max(50, { message: "El icono no puede exceder 50 caracteres" })
    .optional(),

  slug: z
    .string()
    .min(1, { message: "El slug es requerido" })
    .max(100, { message: "El slug no puede exceder 100 caracteres" })
    .regex(/^[a-z0-9-]+$/, {
      message:
        "El slug solo puede contener letras minúsculas, números y guiones",
    }),
});

export type CategoryFormData = z.infer<typeof categoryFormSchema>;
