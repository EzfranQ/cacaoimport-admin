/**
 * Formulario modal para crear y editar categorías
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";

import { categoryFormSchema, type CategoryFormData } from "../schemas";
import { useCategory, useCategories } from "../hooks/useCategories";
import { supabase } from "@/app/libs/supabase";

export const CategoriesFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const queryClient = useQueryClient();

  // Hooks para operaciones CRUD
  const { data: category, isLoading: isLoadingCategory } = useCategory(
    id || ""
  );
  const { data: parentCategories, refetch: refetchParents } = useCategories({ pageSize: 1000 });

  // Configuración del formulario
  const form = useForm({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      parent_id: "none",
      deleted_at: null,
      sort_order: 0,
      icon: "",
      slug: "",
    },
  });

  // Forzar refetch de categorías padre al abrir el modal
  useEffect(() => {
    refetchParents();
  }, []);

  // Cargar datos de categoría para edición
  const prevResetPayloadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isEditing || !category) return;
    const resetPayload = {
      name: category.name,
      description: category.description || "",
      parent_id: category.parent_id || "none",
      deleted_at: category.deleted_at || null,
      icon: category.icon || "",
      slug: category.slug || toSlug(category.name),
    };
    const nextPayload = JSON.stringify(resetPayload);
    if (prevResetPayloadRef.current === nextPayload) return;
    prevResetPayloadRef.current = nextPayload;
    form.reset(resetPayload);
  }, [
    isEditing,
    category?.id,
    category?.name,
    category?.description,
    category?.parent_id,
    category?.deleted_at,
    category?.icon,
    category?.slug,
  ]);

  // Manejar cierre del modal
  const handleClose = () => {
    navigate("/admin/categories");
  };

  // Generar slug automáticamente desde el nombre
  const toSlug = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const watchedName = form.watch("name");
  useEffect(() => {
    form.setValue("slug", toSlug(watchedName || ""), { shouldValidate: true });
  }, [watchedName]);

  // Manejar envío del formulario
  const onSubmit = async (data: CategoryFormData) => {
    try {
      // Convertir string vacío a null para parent_id y procesar deleted_at
      const payload = {
        name: data.name,
        description: data.description || null,
        slug: data.slug,
        parent_id:
          data.parent_id === "none" || data.parent_id === ""
            ? null
            : data.parent_id,
        icon: data.icon || null,
        deleted_at: data.deleted_at || null,
      };

      if (isEditing && id) {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", id)
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Categoría actualizada exitosamente");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([payload])
          .select("id")
          .single();
        if (error) throw error;
        toast.success("Categoría creada exitosamente");
      }

      // Invalidar/Refrescar la tabla de categorías
      await queryClient.invalidateQueries({ queryKey: ["categories"] });

      handleClose();
    } catch (error) {
      console.error("Error al guardar categoría:", error);
      toast.error(
        isEditing ? "Error al actualizar categoría" : "Error al crear categoría"
      );
    }
  };

  const isLoading = form.formState.isSubmitting || isLoadingCategory;

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoría" : "Nueva Categoría"}
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
                    <Input placeholder="Nombre de la categoría" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Descripción */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Descripción de la categoría"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Categoría Padre */}
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría Padre</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || "none"}
                    defaultValue={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccionar categoría padre (opcional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Sin categoría padre</SelectItem>
                      {parentCategories?.data
                        ?.filter((cat) => cat.id !== id) // Evitar seleccionar la misma categoría como padre
                        ?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Orden */}
            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Orden</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Icono */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icono</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Nombre del icono (ej: shopping-cart)"
                      {...field}
                    />
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
