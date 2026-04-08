/**
 * Formulario modal para crear y editar proveedores
 * Se muestra como modal con URL específica usando React Router Outlet
 */

import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/shared/components/ui/textarea";

import { supplierFormSchema, type SupplierFormData } from "../schemas";
import { useSupplier } from "../hooks/useSuppliers";
import { supabase } from "@/app/libs/supabase";
import { Switch } from "@/shared/components/ui/switch";

export const SuppliersFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const queryClient = useQueryClient();

  // Hooks para operaciones CRUD
  const { data: supplier, isLoading: isLoadingSupplier } = useSupplier(
    id || ""
  );

  // Configuración del formulario
  const form = useForm({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      business_name: "",
      contact_name: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      is_active: true,
      deleted_at: null,
    },
  });

  // Cargar datos de proveedor para edición
  const prevResetPayloadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isEditing || !supplier) return;
    const resetPayload = {
      business_name: supplier.business_name,
      contact_name: supplier.contact_name,
      phone: supplier.phone,
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
      is_active: supplier.is_active,
      deleted_at: supplier.deleted_at || null,
    };
    const nextPayload = JSON.stringify(resetPayload);
    if (prevResetPayloadRef.current === nextPayload) return;
    prevResetPayloadRef.current = nextPayload;
    form.reset(resetPayload);
  }, [
    isEditing,
    supplier?.id,
    supplier?.business_name,
    supplier?.contact_name,
    supplier?.phone,
    supplier?.email,
    supplier?.address,
    supplier?.notes,
    supplier?.is_active,
    supplier?.deleted_at,
  ]);

  // Manejar cierre del modal
  const handleClose = () => {
    navigate("/admin/suppliers");
  };

  // Manejar envío del formulario
  const onSubmit = async (data: SupplierFormData) => {
    try {
      // Procesar datos del formulario
      const payload = {
        business_name: data.business_name,
        contact_name: data.contact_name,
        phone: data.phone,
        email: data.email || null,
        address: data.address || null,
        notes: data.notes || null,
        is_active: data.is_active,
        deleted_at: data.deleted_at || null,
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from("suppliers")
          .update(payload)
          .eq("id", id)
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Proveedor actualizado exitosamente");
      } else {
        const { error } = await supabase
          .from("suppliers")
          .insert([payload])
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Proveedor creado exitosamente");
      }

      // Invalidar/Refrescar la tabla de proveedores
      await queryClient.invalidateQueries({ queryKey: ["suppliers"] });

      handleClose();
    } catch (error) {
      console.error("Error al guardar proveedor:", error);
      toast.error(
        isEditing ? "Error al actualizar proveedor" : "Error al crear proveedor"
      );
    }
  };

  const isLoading = form.formState.isSubmitting || isLoadingSupplier;

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Proveedor" : "Nuevo Proveedor"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Razón Social */}
            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Razón Social *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre de la empresa" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nombre de Contacto */}
            <FormField
              control={form.control}
              name="contact_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre de Contacto *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nombre del contacto principal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Teléfono */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número de Teléfono *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ej: +598 99 123 456" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Email */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email"
                      placeholder="contacto@empresa.com" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Dirección */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Dirección completa" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notas adicionales sobre el proveedor"
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estado Activo */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Proveedor Activo
                    </FormLabel>
                    <div className="text-sm text-muted-foreground">
                      Determina si el proveedor está disponible para nuevos pedidos
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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