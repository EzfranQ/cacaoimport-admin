import React, { useState } from "react";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Badge } from "@/shared/components/ui/badge";
import { toast } from "sonner";

import {
  type ProductDiscount,
  type DiscountType,
  useProductDiscounts,
  useCreateProductDiscount,
  useUpdateProductDiscount,
  useDeleteProductDiscount,
  useToggleProductDiscountStatus,
} from "../hooks/useProductDiscounts";

interface ProductDiscountsTableProps {
  productId: string;
}

interface EditingDiscount {
  id?: string;
  min_quantity: number;
  max_quantity: number | null;
  discount_type: DiscountType;
  discount_value: number;
  active: boolean;
}

export const ProductDiscountsTable: React.FC<ProductDiscountsTableProps> = ({
  productId,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingDiscount | null>(null);

  const { data: discounts = [], isLoading } = useProductDiscounts({
    product_id: productId,
    includeInactive: true,
  });

  const createMutation = useCreateProductDiscount();
  const updateMutation = useUpdateProductDiscount();
  const deleteMutation = useDeleteProductDiscount();
  const toggleStatusMutation = useToggleProductDiscountStatus();

  const handleStartAdd = () => {
    setEditingData({
      min_quantity: 1,
      max_quantity: null,
      discount_type: "percentage",
      discount_value: 0,
      active: true,
    });
    setIsAdding(true);
  };

  const handleStartEdit = (discount: ProductDiscount) => {
    setEditingData({
      id: discount.id,
      min_quantity: discount.min_quantity,
      max_quantity: discount.max_quantity,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      active: discount.active,
    });
    setEditingId(discount.id);
  };

  const handleCancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setEditingData(null);
  };

  const validateDiscount = (data: EditingDiscount): string | null => {
    if (data.min_quantity <= 0) {
      return "La cantidad mínima debe ser mayor a 0";
    }

    if (data.max_quantity !== null && data.max_quantity <= data.min_quantity) {
      return "La cantidad máxima debe ser mayor a la cantidad mínima";
    }

    if (data.discount_value < 0) {
      return "El valor del descuento no puede ser negativo";
    }

    if (data.discount_type === "percentage" && data.discount_value > 100) {
      return "El porcentaje de descuento no puede ser mayor a 100%";
    }

    // Validar que no haya solapamiento de rangos
    const otherDiscounts = discounts.filter(d => d.id !== data.id && d.active);
    for (const other of otherDiscounts) {
      const otherMin = other.min_quantity;
      const otherMax = other.max_quantity;
      const newMin = data.min_quantity;
      const newMax = data.max_quantity;

      // Verificar solapamiento: dos rangos se solapan si no están completamente separados
      // Rangos están separados si: newMax < otherMin O newMin > otherMax
      // Por lo tanto, se solapan si: !(newMax < otherMin O newMin > otherMax)
      // Aplicando De Morgan: newMax >= otherMin Y newMin <= otherMax
      
      const newMaxValue = newMax === null ? Infinity : newMax;
      const otherMaxValue = otherMax === null ? Infinity : otherMax;
      
      const overlaps = newMaxValue >= otherMin && newMin <= otherMaxValue;

      if (overlaps) {
        return `El rango se solapa con otro descuento existente (${otherMin}-${otherMax || '∞'})`;
      }
    }

    return null;
  };

  const handleSave = async () => {
    if (!editingData) return;

    const validationError = validateDiscount(editingData);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      if (isAdding) {
        await createMutation.mutateAsync({
          product_id: productId,
          min_quantity: editingData.min_quantity,
          max_quantity: editingData.max_quantity,
          discount_type: editingData.discount_type,
          discount_value: editingData.discount_value,
          active: editingData.active,
        });
        toast.success("Descuento creado exitosamente");
      } else if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          updates: {
            min_quantity: editingData.min_quantity,
            max_quantity: editingData.max_quantity,
            discount_type: editingData.discount_type,
            discount_value: editingData.discount_value,
            active: editingData.active,
          },
        });
        toast.success("Descuento actualizado exitosamente");
      }

      handleCancelEdit();
    } catch (error) {
      toast.error("Error al guardar el descuento");
      console.error(error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este descuento?")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Descuento eliminado exitosamente");
    } catch (error) {
      toast.error("Error al eliminar el descuento");
      console.error(error);
    }
  };

  const handleToggleStatus = async (id: string, active: boolean) => {
    try {
      await toggleStatusMutation.mutateAsync({ id, active });
      toast.success(`Descuento ${active ? "activado" : "desactivado"} exitosamente`);
    } catch (error) {
      toast.error("Error al cambiar el estado del descuento");
      console.error(error);
    }
  };

  const formatDiscountValue = (type: DiscountType, value: number) => {
    return type === "percentage" ? `${value}%` : `$${value.toFixed(2)}`;
  };

  const formatQuantityRange = (min: number, max: number | null) => {
    return max === null ? `${min}+` : `${min}-${max}`;
  };

  if (isLoading) {
    return <div>Cargando descuentos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Descuentos por Cantidad</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleStartAdd}
          disabled={isAdding || editingId !== null}
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Descuento
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rango de Cantidad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isAdding && editingData && (
              <TableRow>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={editingData.min_quantity}
                      onChange={(e) =>
                        setEditingData({
                          ...editingData,
                          min_quantity: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20"
                      min="1"
                    />
                    <span>-</span>
                    <Input
                      type="number"
                      value={editingData.max_quantity || ""}
                      onChange={(e) =>
                        setEditingData({
                          ...editingData,
                          max_quantity: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      className="w-20"
                      placeholder="∞"
                      min={editingData.min_quantity + 1}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Select
                    value={editingData.discount_type}
                    onValueChange={(value: DiscountType) =>
                      setEditingData({ ...editingData, discount_type: value })
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje</SelectItem>
                      <SelectItem value="fixed">Monto Fijo</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {editingData.discount_type === "fixed" && <span>$</span>}
                    <Input
                      type="number"
                      value={editingData.discount_value}
                      onChange={(e) =>
                        setEditingData({
                          ...editingData,
                          discount_value: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-24"
                      min="0"
                      max={editingData.discount_type === "percentage" ? "100" : undefined}
                      step={editingData.discount_type === "percentage" ? "1" : "0.01"}
                    />
                    {editingData.discount_type === "percentage" && <span>%</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={editingData.active ? "default" : "secondary"}>
                    {editingData.active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSave}
                      disabled={createMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {discounts.map((discount) => (
              <TableRow key={discount.id}>
                {editingId === discount.id && editingData ? (
                  <>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="number"
                          value={editingData.min_quantity}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              min_quantity: parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-20"
                          min="1"
                        />
                        <span>-</span>
                        <Input
                          type="number"
                          value={editingData.max_quantity || ""}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              max_quantity: e.target.value ? parseInt(e.target.value) : null,
                            })
                          }
                          className="w-20"
                          placeholder="∞"
                          min={editingData.min_quantity + 1}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={editingData.discount_type}
                        onValueChange={(value: DiscountType) =>
                          setEditingData({ ...editingData, discount_type: value })
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Porcentaje</SelectItem>
                          <SelectItem value="fixed">Monto Fijo</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {editingData.discount_type === "fixed" && <span>$</span>}
                        <Input
                          type="number"
                          value={editingData.discount_value}
                          onChange={(e) =>
                            setEditingData({
                              ...editingData,
                              discount_value: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-24"
                          min="0"
                          max={editingData.discount_type === "percentage" ? "100" : undefined}
                          step={editingData.discount_type === "percentage" ? "1" : "0.01"}
                        />
                        {editingData.discount_type === "percentage" && <span>%</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={editingData.active ? "default" : "secondary"}>
                        {editingData.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleSave}
                          disabled={updateMutation.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell>
                      {formatQuantityRange(discount.min_quantity, discount.max_quantity)}
                    </TableCell>
                    <TableCell>
                      {discount.discount_type === "percentage" ? "Porcentaje" : "Monto Fijo"}
                    </TableCell>
                    <TableCell>
                      {formatDiscountValue(discount.discount_type, discount.discount_value)}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={discount.active ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => handleToggleStatus(discount.id, !discount.active)}
                      >
                        {discount.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(discount)}
                          disabled={isAdding || editingId !== null}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(discount.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}

            {discounts.length === 0 && !isAdding && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No hay descuentos configurados para este producto.
                  <br />
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleStartAdd}
                    className="mt-2"
                  >
                    Agregar el primer descuento
                  </Button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {discounts.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <p>
            <strong>Nota:</strong> Los descuentos se aplican automáticamente según la cantidad comprada.
            Los rangos no pueden solaparse entre sí.
          </p>
        </div>
      )}
    </div>
  );
};