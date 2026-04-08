/**
 * Formulario modal para crear y editar Atributos de Producto.
 * Incluye:
 * - Campos: name y description.
 * - Asociación de Unidades de medida (tabla puente attribute_units).
 * - Selección de una unidad por defecto mediante una "estrella" única.
 *
 * La unidad por defecto se persiste en attribute_units.is_default.
 */
import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";

import { useAttribute } from "../hooks/useAttributes";
import { useCreateAttribute, useUpdateAttribute } from "../hooks/useAttributes";
import { useUnits } from "../hooks/useUnits";
import {
  useAttributeUnits,
  useUpsertAttributeUnits,
} from "../hooks/useAttributeUnits";
import { MultiSelect } from "@/shared/components/ui/select";
import { Table } from "@/shared/components/ui/table";
import { Star } from "lucide-react";

// Schema con unidades seleccionables
const attributeFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  unitIds: z.array(z.string()).optional().default([]),
  defaultUnitId: z.string().nullable().optional().default(null),
});

export type AttributeFormInput = z.input<typeof attributeFormSchema>;
export type AttributeFormData = z.output<typeof attributeFormSchema>;

export const AttributesFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const queryClient = useQueryClient();

  const { data: attribute, isLoading: isLoadingAttribute } = useAttribute(
    id || ""
  );
  const createMutation = useCreateAttribute();
  const updateMutation = useUpdateAttribute();
  const upsertAttributeUnits = useUpsertAttributeUnits();

  // Cargar listado de unidades para selección
  const { data: unitsResult, isLoading: isLoadingUnits } = useUnits({
    page: 1,
    pageSize: 1000,
    includeDeleted: false,
    sortBy: "name",
    sortOrder: "asc",
  });
  const units = unitsResult?.data ?? [];

  // Si estamos editando, cargar unidades asociadas al atributo
  const { data: linkedUnitsResult, isLoading: isLoadingLinkedUnits } =
    useAttributeUnits(id || "");
  const linkedUnitIds = linkedUnitsResult?.unitIds ?? [];
  const linkedDefaultUnitId = linkedUnitsResult?.defaultUnitId ?? null;

  const form = useForm<AttributeFormInput, any, AttributeFormData>({
    resolver: zodResolver(attributeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      unitIds: [],
      defaultUnitId: null,
    },
  });

  const prevResetPayloadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isEditing || !attribute) return;
    const resetPayload = {
      name: attribute.name,
      description: attribute.description || "",
      unitIds: linkedUnitIds,
      defaultUnitId: linkedDefaultUnitId,
    };
    const nextPayload = JSON.stringify(resetPayload);
    if (prevResetPayloadRef.current === nextPayload) return;
    prevResetPayloadRef.current = nextPayload;
    form.reset(resetPayload);
  }, [
    isEditing,
    attribute?.id,
    attribute?.name,
    attribute?.description,
    linkedUnitIds.join(","),
    linkedDefaultUnitId,
  ]);

  // Mantener consistencia: si se deselecciona la unidad default, limpiar defaultUnitId
  useEffect(() => {
    const currentUnitIds = form.getValues("unitIds") ?? [];
    const currentDefault = form.getValues("defaultUnitId") ?? null;
    if (currentDefault && !currentUnitIds.includes(currentDefault)) {
      form.setValue("defaultUnitId", null, { shouldDirty: true });
    }
  }, [form.watch("unitIds")?.join(",")]);

  const handleClose = () => {
    navigate("/admin/attributes");
  };

  const onSubmit = async (data: AttributeFormData) => {
    try {
      let attributeId = id;
      if (isEditing && id) {
        await updateMutation.mutateAsync({
          id,
          updates: { name: data.name, description: data.description },
        });
        attributeId = id;
        toast.success("Atributo actualizado");
      } else {
        const created = await createMutation.mutateAsync({
          name: data.name,
          description: data.description,
        });
        attributeId = created.id;
        toast.success("Atributo creado");
      }

      // Actualizar relaciones atributo-unidades
      await upsertAttributeUnits.mutateAsync({
        attributeId: attributeId!,
        unitIds: data.unitIds,
        defaultUnitId: data.defaultUnitId ?? null,
      });

      queryClient.invalidateQueries({ queryKey: ["attributes"] });
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    }
  };

  const isLoading =
    form.formState.isSubmitting ||
    isLoadingAttribute ||
    isLoadingUnits ||
    isLoadingLinkedUnits;

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Atributo" : "Nuevo Atributo"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nombre */}
            <FormField<AttributeFormInput>
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del atributo" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField<AttributeFormInput>
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Descripción (opcional)" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Unidades permitidas */}
            <FormField<AttributeFormInput>
              control={form.control}
              name="unitIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unidades permitidas</FormLabel>
                  <FormControl>
                    <MultiSelect
                    options={(units ?? []).map((u) => ({
                      value: u.id,
                      label: u.name + (u.code ? ` (${u.code})` : ""),
                    }))}
                    value={Array.isArray(field.value) ? field.value : []}
                    onValueChange={(values) => field.onChange(values)}
                    placeholder="Seleccionar unidades"
                    disabled={isLoadingUnits}
                    className="w-full"
                  />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tabla: Nombre / Default (estrella única) */}
            {Array.isArray(form.watch("unitIds")) && (form.watch("unitIds")?.length ?? 0) > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">Marca una sola unidad como predeterminada para este atributo.</div>
                <div className="border rounded">
                  <Table>
                    <thead>
                      <tr>
                        <th className="text-left p-2">Unidad</th>
                        <th className="text-left p-2">Default</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.watch("unitIds")?.map((uid) => {
                        const unit = (units ?? []).find((u) => u.id === uid);
                        const isDefault = form.watch("defaultUnitId") === uid;
                        return (
                          <tr key={uid}>
                            <td className="p-2 text-sm">{unit ? unit.name : uid}</td>
                            <td className="p-2">
                              <Button
                                type="button"
                                variant={isDefault ? "default" : "ghost"}
                                size="sm"
                                onClick={() => {
                                  // Alternar: si clic en la misma, opcionalmente desmarca; por ahora, asegura una sola selección
                                  form.setValue("defaultUnitId", uid, { shouldDirty: true });
                                }}
                                aria-label={isDefault ? "Unidad por defecto" : "Marcar como defecto"}
                              >
                                <Star className="h-4 w-4" {...(isDefault ? { fill: "currentColor" } : {})} />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? "Guardando..."
                  : isEditing
                  ? "Actualizar"
                  : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
