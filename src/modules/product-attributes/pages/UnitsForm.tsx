/**
 * Formulario modal para crear y editar Unidades de Medida
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

import { useUnit } from "../hooks/useUnits";
import { useCreateUnit, useUpdateUnit } from "../hooks/useUnits";

const unitFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  code: z.string().min(1, "El código es obligatorio"),
  symbol: z.string().optional(),
});

export type UnitFormData = z.infer<typeof unitFormSchema>;

export const UnitsFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const queryClient = useQueryClient();

  const { data: unit, isLoading: isLoadingUnit } = useUnit(id || "");
  const createMutation = useCreateUnit();
  const updateMutation = useUpdateUnit();

  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: {
      name: "",
      code: "",
      symbol: "",
    },
  });

  const prevResetPayloadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isEditing || !unit) return;
    const resetPayload = {
      name: unit.name,
      code: unit.code,
      symbol: unit.symbol || "",
    };
    const nextPayload = JSON.stringify(resetPayload);
    if (prevResetPayloadRef.current === nextPayload) return;
    prevResetPayloadRef.current = nextPayload;
    form.reset(resetPayload);
  }, [
    isEditing,
    unit?.id,
    unit?.name,
    unit?.code,
    unit?.symbol,
  ]);

  const handleClose = () => {
    navigate("/admin/units");
  };

  const onSubmit = async (data: UnitFormData) => {
    try {
      if (isEditing && id) {
        await updateMutation.mutateAsync({ id, updates: data });
        toast.success("Unidad actualizada");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Unidad creada");
      }
      queryClient.invalidateQueries({ queryKey: ["units"] });
      handleClose();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar");
    }
  };

  const isLoading = form.formState.isSubmitting || isLoadingUnit;

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Unidad" : "Nueva Unidad"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la unidad" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Código */}
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código *</FormLabel>
                  <FormControl>
                    <Input placeholder="Código (ej: kg, cm)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Símbolo */}
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Símbolo</FormLabel>
                  <FormControl>
                    <Input placeholder="Símbolo (opcional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {isLoading ? "Guardando..." : isEditing ? "Actualizar" : "Crear"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}