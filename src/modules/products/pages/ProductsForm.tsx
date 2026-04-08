/**
 * Formulario modal para crear y editar Productos
 * Campos: name, description, price, product_id (padre), y selección de atributos.
 *
 * Auto-preselección: cuando un atributo seleccionado tiene una unidad por defecto
 * (`attribute_units.is_default = true`), se autoselecciona esa unidad si el usuario
 * aún no ha elegido una. También se muestra un indicador visual en la lista de
 * unidades para identificar la unidad por defecto.
 */
import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  MultiSelect,
} from "@/shared/components/ui/select";

import {
  useProduct,
  useCreateProduct,
  useUpdateProduct,
  useProducts,
} from "../hooks/useProducts";
import { useAttributes } from "@/modules/product-attributes/hooks/useAttributes";
import {
  useProductAttributes,
  useUpsertProductAttributes,
  useAttributeUnitsBatch,
} from "../hooks/useProductAttributes";
import {
  useProductImages,
  useUploadProductImages,
  useDeleteProductImage,
  useSetPrimaryProductImage,
} from "../hooks/useProductImages";
import { useCategories } from "@/modules/categories/hooks/useCategories";
import {
  useProductCategories,
  useUpdateProductCategories,
} from "../hooks/useProductCategories";
import { useActiveSuppliersForSelect, useSupplier } from "@/modules/suppliers/hooks/useSuppliers";
import { ProductDiscountsTable } from "../components/ProductDiscountsTable";

const productFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  sku: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true; // SKU es opcional
        return /^[A-Z0-9-_]+$/i.test(val); // Solo letras, números, guiones y guiones bajos
      },
      {
        message: "El SKU solo puede contener letras, números, guiones (-) y guiones bajos (_)",
      }
    )
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        return val.length >= 3 && val.length <= 50;
      },
      {
        message: "El SKU debe tener entre 3 y 50 caracteres",
      }
    ),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "El precio debe ser mayor o igual a 0"),
  qty_box: z.coerce.number().min(1, "La cantidad mínima por caja es 1").optional().nullable(),
  product_id: z.string().optional().nullable(),
  supplier_id: z.string().optional().nullable(),
  categoryIds: z.array(z.string()).optional().default([]),
  attributeIds: z.array(z.string()).optional().default([]),
  attributeValues: z
    .record(z.string(), z.string().nullable())
    .optional()
    .default({}),
  attributeUnits: z
    .record(z.string(), z.string().nullable())
    .optional()
    .default({}),
  images: z
    .array(
      z.object({
        file: z.any(),
        previewUrl: z.string().optional(),
        alt: z.string().optional(),
        isPrimary: z.boolean().optional(),
        // Campos adicionales para imágenes existentes
        productImageId: z.string().optional(),
        publicUrl: z.string().optional(),
      })
    )
    .optional()
    .default([]),
});

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormData = z.output<typeof productFormSchema>;

export const ProductsFormPage = () => {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormData>,
    defaultValues: {
      name: "",
      sku: null,
      description: "",
      price: 0,
      qty_box: null,
      product_id: null,
      supplier_id: null,
      categoryIds: [],
      attributeIds: [],
      attributeValues: {},
      attributeUnits: {},
      images: [],
    },
  });
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const queryClient = useQueryClient();

  const { data: product, isLoading: isLoadingProduct } = useProduct(id || "");
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const upsertProductAttributes = useUpsertProductAttributes();
  const uploadImagesMutation = useUploadProductImages();
  const { data: currentImages } = useProductImages(id || "");
  const deleteImageMutation = useDeleteProductImage();
  const setPrimaryMutation = useSetPrimaryProductImage();

  // Listado de productos para seleccionar padre (product_id)
  const { data: productsResult, isLoading: isLoadingProducts } = useProducts({
    page: 1,
    pageSize: 1000,
    includeDeleted: false,
    sortBy: "name",
    sortOrder: "asc",
  });
  const parentOptions = (productsResult?.data ?? [])
    .filter((p) => p.id !== id)
    .map((p) => ({ value: p.id, label: p.name }));

  // Listado de atributos para multiselección
  const { data: attributesResult, isLoading: isLoadingAttributes } =
    useAttributes({
      page: 1,
      pageSize: 1000,
      includeDeleted: false,
      sortBy: "name",
      sortOrder: "asc",
    });
  const attributeOptions = (attributesResult?.data ?? []).map((a) => ({
    value: a.id,
    label: a.name,
  }));

  // Listado de categorías para multiselección
  const { data: categoriesResult, isLoading: isLoadingCategories } =
    useCategories({
      page: 1,
      pageSize: 1000,
      includeDeleted: false,
      sortBy: "name",
      sortOrder: "asc",
    });
  const categoryOptions = (categoriesResult?.data ?? []).map((c) => ({
    value: c.id,
    label: c.name,
  }));

  // Listado de proveedores para selección
  const { data: suppliersResult, isLoading: isLoadingSuppliers } =
    useActiveSuppliersForSelect();
  // Si el producto actual tiene proveedor que no aparece en la lista (posiblemente inactivo), lo traemos para ofrecerlo como opción
  const { data: currentSupplier } = useSupplier(product?.supplier_id || "");

  // Debug logs temporales
  console.log("Suppliers result:", suppliersResult);
  console.log("Is loading suppliers:", isLoadingSuppliers);

  const supplierOptions = (suppliersResult ?? []).map((s) => ({
    value: s.id,
    label: s.business_name,
  }));
  // Agregar opción de proveedor actual si no está en la lista (por ejemplo, inactivo)
  if (
    isEditing &&
    product?.supplier_id &&
    !supplierOptions.some((opt) => opt.value === product.supplier_id) &&
    currentSupplier
  ) {
    supplierOptions.unshift({
      value: currentSupplier.id,
      label: `${currentSupplier.business_name} (inactivo)`,
    });
  }

  console.log("Supplier options:", supplierOptions);

  // Si estamos editando, cargar categorías asociadas al producto
  const { data: linkedCategoriesResult } = useProductCategories(id || "");
  const linkedCategoryIds =
    linkedCategoriesResult?.map((pc) => pc.category_id) ?? [];
  const updateProductCategories = useUpdateProductCategories();

  // Si estamos editando, cargar atributos asociados al producto
  const { data: linkedAttrsResult } = useProductAttributes(id || "");
  const linkedAttributeIds = linkedAttrsResult?.attributeIds ?? [];
  const linkedAttributeValues = linkedAttrsResult?.values ?? {};
  const linkedAttributeUnits = linkedAttrsResult?.units ?? {};

  // Obtener unidades disponibles para cada atributo seleccionado (batch hook)
  const selectedAttributeIdsRaw = form.watch("attributeIds") ?? [];
  const selectedAttributeIds = Array.isArray(selectedAttributeIdsRaw)
    ? Array.from(new Set(selectedAttributeIdsRaw))
    : [];
  const { data: attributeUnitsMap } = useAttributeUnitsBatch(selectedAttributeIds);

  // Asegura que attributeUnits solo contenga claves de atributos seleccionados
  useEffect(() => {
    const currentUnits = form.getValues("attributeUnits") || {};
    const onlySelected = selectedAttributeIds.reduce<
      Record<string, string | null>
    >((acc, attrId) => {
      acc[attrId] = currentUnits[attrId] ?? null;
      return acc;
    }, {});
    form.setValue("attributeUnits", onlySelected, { shouldDirty: false });
  }, [selectedAttributeIds, form]);

  // Autoseleccionar la unidad por defecto para atributos con unidades disponibles
  useEffect(() => {
    if (!attributeUnitsMap) return;
    selectedAttributeIds.forEach((attrId) => {
      const units = attributeUnitsMap?.[attrId] ?? [];
      if (units.length === 0) return;
      const allowedIds = units.map((u) => u.unit_id);
      const defaultUnit = units.find((u) => u.is_default);
      const current = form.getValues(`attributeUnits.${attrId}`) as
        | string
        | null
        | undefined;

      // Si no hay selección actual o es inválida, aplicar la unidad por defecto directamente al campo anidado
      if ((!current || !allowedIds.includes(current)) && defaultUnit) {
        form.setValue(`attributeUnits.${attrId}`, defaultUnit.unit_id, {
          shouldDirty: false,
          shouldValidate: true,
        });
      }
    });
  }, [attributeUnitsMap, selectedAttributeIds, form]);

  const prevResetPayloadRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    // Resetear apenas tengamos el producto (SIN esperar a que carguen los proveedores)
    // Esto evita que el campo de proveedor quede sin valor seleccionado al entrar a editar.
    if (!isEditing || !product) return;

    console.log('🔄 ProductsForm: Resetting form with product data:', {
      productId: product.id,
      productName: product.name,
      supplierIdFromProduct: product.supplier_id,
      supplierIdType: typeof product.supplier_id,
      suppliersLoaded: !isLoadingSuppliers,
      supplierOptionsCount: supplierOptions.length,
      availableSupplierIds: supplierOptions.map(opt => ({ value: opt.value, label: opt.label, type: typeof opt.value })),
      linkedCategoryIds,
      linkedAttributeIds
    });

    const resetPayloadObj: ProductFormData = {
      name: product.name,
      sku: product.sku ?? null,
      description: product.description ?? '',
      price: product.price,
      qty_box: product.qty_box ?? null,
      product_id: product.product_id ?? null,
      supplier_id: product.supplier_id ?? null,
      categoryIds: linkedCategoryIds,
      attributeIds: linkedAttributeIds,
      attributeValues: linkedAttributeValues,
      attributeUnits: linkedAttributeUnits,
      images: currentImages?.map(img => ({
        file: img.publicUrl,
        previewUrl: img.publicUrl,
        alt: img.alt ?? "",
        isPrimary: img.isPrimary,
        productImageId: img.productImageId,
        publicUrl: img.publicUrl,
      })) ?? [],
    };

    console.log('📝 ProductsForm: Reset payload supplier_id:', resetPayloadObj.supplier_id);

    const resetPayload = JSON.stringify(resetPayloadObj);
    if (resetPayload === prevResetPayloadRef.current) return;
    prevResetPayloadRef.current = resetPayload;

    form.reset(resetPayloadObj);

    // Verificar que el valor se estableció correctamente
    setTimeout(() => {
      const currentSupplierValue = form.getValues('supplier_id');
      const matchingOption = supplierOptions.find(opt => opt.value === currentSupplierValue);
      console.log('✅ ProductsForm: Supplier value after reset:', {
        currentValue: currentSupplierValue,
        currentValueType: typeof currentSupplierValue,
        matchingOption: matchingOption,
        allOptions: supplierOptions.map(opt => ({ value: opt.value, label: opt.label }))
      });
    }, 100);
  }, [
    form,
    isEditing,
    product,
    linkedCategoryIds,
    linkedAttributeIds,
    linkedAttributeValues,
    linkedAttributeUnits,
    currentImages,
  ]);

  // Asegurar que el proveedor se setea apenas cargue el producto, sin esperar a que carguen los proveedores
  useEffect(() => {
    if (!isEditing || !product) return;
    form.setValue("supplier_id", product.supplier_id ?? null, { shouldDirty: false });
  }, [isEditing, id, product?.supplier_id]);

  const onSubmit = async (formData: ProductFormData) => {
    try {
      // Crear/actualizar producto base
      let productId = isEditing ? id! : undefined;
      // Normalizar supplier_id: convertir "" en null para evitar errores de UUID
      const safeSupplierId =
        formData.supplier_id && formData.supplier_id.trim() !== ""
          ? formData.supplier_id
          : null;
      const productData = {
        name: formData.name,
        sku: formData.sku,
        description: formData.description,
        price: formData.price,
        qty_box: formData.qty_box,
        product_id: formData.product_id,
        supplier_id: safeSupplierId,
      };

      if (isEditing) {
        await updateMutation.mutateAsync({
          id: productId!,
          updates: productData,
        });
      } else {
        const result = await createMutation.mutateAsync(productData);
        productId = result.id;
      }

      // Actualizar categorías
      await updateProductCategories.mutateAsync({
        productId: productId!,
        categoryIds: formData.categoryIds,
      });

      // Actualizar atributos y unidades
      // Sanitizamos unit_id para asegurar que pertenezca a las unidades permitidas del atributo
      await upsertProductAttributes.mutateAsync({
        productId: productId!,
        attributes: formData.attributeIds.map((attrId) => {
          const allowedUnits = (attributeUnitsMap?.[attrId] ?? []).map((u) => u.unit_id);
          const chosenUnit = formData.attributeUnits[attrId] ?? null;
          const safeUnitId = chosenUnit && allowedUnits.includes(chosenUnit) ? chosenUnit : null;

          return {
            id: attrId,
            value: formData.attributeValues[attrId] ?? null,
            unit_id: safeUnitId,
          };
        }),
      });

      // Subir imágenes nuevas
      const newImages = formData.images.filter(
        (img) => img.file instanceof File
      );
      if (newImages.length > 0) {
        await uploadImagesMutation.mutateAsync({
          productId: productId!,
          items: newImages.map((img) => ({
            file: img.file,
            alt: img.alt,
            isPrimary: img.isPrimary,
          })),
        });
      }

      toast.success(
        isEditing
          ? "Producto actualizado correctamente"
          : "Producto creado correctamente"
      );

      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (isEditing) {
        // Asegurar invalidación del query del producto individual
        queryClient.invalidateQueries({ queryKey: ["products", productId] });
      }
      // Invalida relaciones de atributos y unidades para reflejar inmediatamente los cambios
      queryClient.invalidateQueries({ queryKey: ["product-attributes", productId] });
      queryClient.invalidateQueries({ queryKey: ["attribute-units-batch"] });

      // Volver al listado
      navigate("/admin/products");
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(
        `Error ${isEditing ? "actualizando" : "creando"} producto: ${error.message
        }`
      );
    }
  };

  const onCancel = () => navigate("/admin/products");

  if (isLoadingProduct && isEditing) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isEditing ? "Editar Producto" : "Nuevo Producto"}
        </h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Nombre */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nombre del producto" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SKU */}
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} placeholder="Código SKU del producto" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Precio */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cantidad por caja */}
            <FormField
              control={form.control}
              name="qty_box"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cantidad por caja</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      type="number"
                      min="1"
                      placeholder="Cantidad de productos por caja"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Descripción */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Descripción del producto"
                    rows={4}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Categorías */}
          <FormField
            control={form.control}
            name="categoryIds"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categorías</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={categoryOptions}
                    value={Array.isArray(field.value) ? field.value : []}
                    onValueChange={field.onChange}
                    disabled={isLoadingCategories}
                    placeholder="Seleccionar categorías"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Producto padre */}
          <FormField
            control={form.control}
            name="product_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Producto padre (opcional)</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  value={field.value || "none"}
                  disabled={isLoadingProducts}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar producto padre" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {parentOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Proveedor */}
          <FormField
            control={form.control}
            name="supplier_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proveedor (opcional)</FormLabel>
                <Select
                  onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  value={field.value || "none"}
                  disabled={isLoadingSuppliers}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Ninguno</SelectItem>
                    {supplierOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Atributos */}
          <FormField
            control={form.control}
            name="attributeIds"
            render={({ field }) => (
              <FormItem className="space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="text-base">
                    Atributos del Producto
                  </FormLabel>
                  <MultiSelect
                    options={attributeOptions}
                    value={Array.isArray(field.value) ? field.value : []}
                    onValueChange={field.onChange}
                    disabled={isLoadingAttributes}
                    placeholder="Seleccionar atributos"
                  />
                </div>
                <div className="space-y-4">
                  {Array.from(new Set(field.value ?? [])).map((attrId) => {
                    const attribute = attributesResult?.data?.find(
                      (a) => a.id === attrId
                    );
                    const units = attributeUnitsMap?.[attrId] ?? [];
                    const showUnitSelect = units.length > 0;

                    return (
                      <div
                        key={attrId}
                        className={showUnitSelect ? "grid grid-cols-2 gap-4" : "grid grid-cols-1 gap-4"}
                      >
                        <FormField
                          control={form.control}
                          name={`attributeValues.${attrId}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{attribute?.name}</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  value={field.value ?? ""}
                                  placeholder={`Valor para ${attribute?.name}`}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {showUnitSelect && (
                          <FormField
                            control={form.control}
                            name={`attributeUnits.${attrId}`}
                            render={({ field: unitField }) => (
                              <FormItem>
                                <FormLabel>Unidad de Medida</FormLabel>
                                <Select
                                  onValueChange={unitField.onChange}
                                  value={form.watch(`attributeUnits.${attrId}`) ?? undefined}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Seleccionar unidad" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {units.map((unit) => (
                                      <SelectItem
                                        key={unit.unit_id}
                                        value={unit.unit_id}
                                      >
                                        {unit.unit_name}
                                        {unit.unit_symbol ? ` (${unit.unit_symbol})` : ""}
                                        {unit.is_default ? "  — por defecto" : ""}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </FormItem>
            )}
          />

          {/* Imágenes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <FormLabel className="text-base">Imágenes del Producto</FormLabel>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  const currentImages = form.getValues("images") || [];
                  // Solo la primera imagen del lote será marcada como principal
                  const newImages = files.map((file, idx) => ({
                    file,
                    previewUrl: URL.createObjectURL(file),
                    alt: "",
                    isPrimary: currentImages.length === 0 && idx === 0,
                  }));
                  form.setValue("images", [...currentImages, ...newImages]);
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
              >
                Agregar Imágenes
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {form.watch("images")?.map((image, index) => (
                <div
                  key={index}
                  className="relative border rounded-lg p-2 space-y-2"
                >
                  <img
                    src={image.previewUrl || image.publicUrl}
                    alt={image.alt}
                    className="w-full h-32 object-cover rounded"
                  />
                  <Input
                    value={image.alt || ""}
                    onChange={(e) => {
                      const images = form.getValues("images");
                      images[index].alt = e.target.value;
                      form.setValue("images", images);
                    }}
                    placeholder="Descripción de la imagen"
                  />
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const images = form.getValues("images");
                        if (image.productImageId && isEditing) {
                          deleteImageMutation.mutate({
                            productId: id!,
                            productImageId: image.productImageId,
                          });
                        }
                        images.splice(index, 1);
                        form.setValue("images", images);
                      }}
                    >
                      Eliminar
                    </Button>
                    <Button
                      type="button"
                      variant={image.isPrimary ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const images = form.getValues("images");
                        images.forEach((img, i) => {
                          img.isPrimary = i === index;
                        });
                        if (image.productImageId && isEditing) {
                          setPrimaryMutation.mutate({
                            productId: id!,
                            productImageId: image.productImageId,
                          });
                        }
                        form.setValue("images", images);
                      }}
                    >
                      {image.isPrimary ? "Principal" : "Hacer Principal"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Descuentos por Cantidad - Solo mostrar si estamos editando un producto existente */}
          {isEditing && id && (
            <div className="space-y-4">
              <ProductDiscountsTable productId={id} />
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                (isEditing && isLoadingProduct) ||
                createMutation.isPending ||
                updateMutation.isPending ||
                uploadImagesMutation.isPending ||
                upsertProductAttributes.isPending
              }
            // onClick={form.handleSubmit(onSubmit)}
            >
              {isEditing ? "Guardar Cambios" : "Crear Producto"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
