import { z } from "zod";

/**
 * Esquema de validación para crear/editar proveedores
 */
export const supplierFormSchema = z.object({
  business_name: z
    .string()
    .min(1, { message: "La razón social es requerida" })
    .max(200, { message: "La razón social no puede exceder 200 caracteres" })
    .refine((val) => val.trim().length > 0, {
      message: "La razón social no puede estar vacía",
    }),

  contact_name: z
    .string()
    .min(1, { message: "El nombre de contacto es requerido" })
    .max(100, { message: "El nombre de contacto no puede exceder 100 caracteres" })
    .refine((val) => val.trim().length > 0, {
      message: "El nombre de contacto no puede estar vacío",
    }),

  phone: z
    .string()
    .min(1, { message: "El número de teléfono es requerido" })
    .regex(/^[\+]?[0-9\s\-\(\)]{8,20}$/, {
      message: "El formato del teléfono no es válido. Debe contener entre 8 y 20 dígitos",
    }),

  email: z
    .string()
    .email({ message: "El formato del email no es válido" })
    .max(255, { message: "El email no puede exceder 255 caracteres" })
    .optional()
    .or(z.literal("")),

  address: z
    .string()
    .max(500, { message: "La dirección no puede exceder 500 caracteres" })
    .optional()
    .or(z.literal("")),

  notes: z
    .string()
    .max(1000, { message: "Las notas no pueden exceder 1000 caracteres" })
    .optional()
    .or(z.literal("")),

  is_active: z
    .boolean()
    .default(true),

  deleted_at: z
    .string()
    .datetime({ message: "Fecha de eliminación inválida" })
    .optional()
    .nullable(),
});

/**
 * Esquema para filtros de búsqueda de proveedores
 */
export const suppliersFilterSchema = z.object({
  search: z
    .string()
    .max(100, { message: "La búsqueda no puede exceder 100 caracteres" })
    .optional(),

  isActive: z
    .boolean()
    .optional(),

  includeDeleted: z
    .boolean()
    .default(false),

  sortBy: z
    .enum(["business_name", "contact_name", "phone", "created_at", "updated_at"])
    .default("business_name"),

  sortOrder: z
    .enum(["asc", "desc"])
    .default("asc"),

  page: z
    .number()
    .int()
    .min(1, { message: "La página debe ser mayor a 0" })
    .default(1),

  pageSize: z
    .number()
    .int()
    .min(1, { message: "El tamaño de página debe ser mayor a 0" })
    .max(100, { message: "El tamaño de página no puede exceder 100" })
    .default(10),
});

export type SupplierFormData = z.infer<typeof supplierFormSchema>;
export type SuppliersFilterData = z.infer<typeof suppliersFilterSchema>;

/**
 * Esquema para transformar datos del formulario antes del envío
 */
export const transformSupplierFormData = (data: SupplierFormData) => {
  return {
    business_name: data.business_name.trim(),
    contact_name: data.contact_name.trim(),
    phone: data.phone.trim(),
    email: data.email && data.email.trim() !== "" ? data.email.trim() : null,
    address: data.address && data.address.trim() !== "" ? data.address.trim() : null,
    notes: data.notes && data.notes.trim() !== "" ? data.notes.trim() : null,
    is_active: data.is_active,
  };
};