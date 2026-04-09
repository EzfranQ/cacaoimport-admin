import { useParams, Link } from "react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Table } from "@/shared/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/components/ui/select";
import { Input } from "@/shared/components/ui/input";
import { useOrder, useOrderStatuses, useUpdateOrderStatus, useUpdateOrderDetails } from "../hooks/useOrders";
import { supabase } from "@/app/libs/supabase";
import { toast } from "sonner";
import HistoryDialog from "../components/HistoryDialog";
import PaymentProofDialog from "../components/PaymentProofDialog";
import { generateInvoicePDF } from "../utils/pdf";
import { Download, Edit, Save, X, Trash2 } from "lucide-react";

export const OrderDetailPage = () => {
  const { id } = useParams();
  const { data: order, isLoading, error } = useOrder(id || "");
  const { data: statuses = [] } = useOrderStatuses();
  const updateStatus = useUpdateOrderStatus();
  const updateOrderDetails = useUpdateOrderDetails();

  const [pendingStatus, setPendingStatus] = useState<string | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);
  const [showProof, setShowProof] = useState(false);
  const [proofError, setProofError] = useState(false);

  // Logo upload state
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setLogoDataUrl(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<any[]>([]);
  const [editedShipping, setEditedShipping] = useState<number>(0);

  // Transiciones permitidas: from_status_id -> [to_status_id]
  const { data: transitions } = useQuery({
    queryKey: ["order_status_transitions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_status_transitions")
        .select("from_status_id,to_status_id");
      if (error) throw new Error(`Error obteniendo transiciones: ${error.message}`);
      return data ?? [];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });
  const transitionMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    (transitions ?? []).forEach((t: any) => {
      const from = t.from_status_id as string;
      const to = t.to_status_id as string;
      if (!map[from]) map[from] = [];
      map[from].push(to);
    });
    return map;
  }, [transitions]);

  if (isLoading) return <div>Cargando...</div>;
  if (error) return <div>Error cargando orden: {(error as any)?.message}</div>;
  if (!order) return <div>No encontrada</div>;

  const originalItems = (order as any).items ?? [];
  const address = (order as any).address ?? null;
  const proofUrl: string | null = (order as any).payment_proof_url ?? null;
  const isImageProof = typeof proofUrl === "string" && /\.(png|jpg|jpeg|webp|gif)$/i.test(proofUrl);

  const getItemName = (it: any) => {
    return (
      it.name ?? it.product_name ?? it.productName ?? it.product?.name ?? it.product_id ?? "-"
    );
  };

  const getItemSku = (it: any) => {
    return (
      it.sku ?? it.product_sku ?? it.productSku ?? it.product?.sku ?? "-"
    );
  };

  const getItemUnitPrice = (it: any) => {
    const price = it.unit_price ?? it.sale_price ?? it.price ?? 0;
    return Number(price);
  };

  // Funciones de edicion
  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedItems(JSON.parse(JSON.stringify(originalItems)));
      setEditedShipping(Number(order.shipping ?? 0));
    }
    setIsEditing(!isEditing);
  };

  const currentItems = isEditing ? editedItems : originalItems;
  const currentSubtotal = currentItems.reduce((acc: number, it: any) => acc + (getItemUnitPrice(it) * Number(it.quantity)), 0);
  const currentShipping = isEditing ? editedShipping : Number(order.shipping ?? 0);
  const currentTotal = currentSubtotal + currentShipping;

  const handleQuantityChange = (itemId: string, newQty: number) => {
    setEditedItems(editedItems.map(it => it.id === itemId ? { ...it, quantity: Math.max(1, newQty) } : it));
  };

  const handlePriceChange = (itemId: string, newPrice: number) => {
    setEditedItems(editedItems.map(it => it.id === itemId ? { ...it, unit_price: Math.max(0, newPrice) } : it));
  };

  const handleRemoveItem = (itemId: string) => {
    setEditedItems(editedItems.filter(it => it.id !== itemId));
  };

  const handleSaveDetails = async () => {
    try {
      await updateOrderDetails.mutateAsync({
        orderId: order.id,
        items: editedItems,
        subtotal: currentSubtotal,
        shipping: currentShipping,
        total: currentTotal,
      });
      toast.success("Detalles de orden actualizados");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar la orden");
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Orden {order.id}
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              title="Subir Logo (Opcional)"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleLogoUpload}
            />
            <Button variant="outline" className="pointer-events-none flex items-center gap-2 text-xs h-9">
              {logoDataUrl ? "Logo (OK)" : "Subir Logo"}
            </Button>
          </div>
          <Button variant="outline" onClick={() => generateInvoicePDF(order, logoDataUrl)} className="flex items-center gap-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
            <Download size={16} /> PDF
          </Button>
          <Link to="/admin/orders">
            <Button variant="outline">Volver al listado</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Cliente</h2>
          <div className="border rounded p-3 text-sm h-full">
            <div><span className="font-medium">Nombre:</span> {order.profile?.full_name ?? "Desconocido"}</div>
            <div><span className="font-medium">Profile ID:</span> {order.profile_id}</div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Estado</h2>
          <div className="border rounded p-3 text-sm h-full flex flex-col gap-3 justify-center">
            <div>
              <span className="font-medium">Actual:</span> {order.order_status?.label ?? order.id_status}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground whitespace-nowrap">Cambiar a:</span>
              <Select
                value={pendingStatus ?? order.id_status}
                onValueChange={(value) => setPendingStatus(value)}
                disabled={updateStatus.isPending || statuses.length === 0}
              >
                <SelectTrigger size="sm" className="w-[180px]">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key={`current-${order.id_status}`} value={order.id_status} disabled>
                    {(order.order_status?.label ?? order.id_status) + " (actual)"}
                  </SelectItem>
                  {(() => {
                    const allowed = transitionMap[order.id_status] ?? [];
                    const allowedStatuses = (statuses ?? []).filter((s) => allowed.includes(s.id));
                    return allowedStatuses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const next = pendingStatus;
                  if (!next || next === order.id_status) {
                    toast.warning("Selecciona un estado diferente");
                    return;
                  }
                  try {
                    await updateStatus.mutateAsync({ orderId: order.id, statusId: next });
                    toast.success("Estado actualizado");
                  } catch (err: any) {
                    const nextLabel = (statuses ?? []).find((s) => s.id === next)?.label ?? next;
                    const currentLabel = order.order_status?.label ?? order.id_status;
                    if (typeof err?.message === "string" && err.message.includes("Transición de estado no permitida")) {
                      toast.error(`Transición no permitida: ${currentLabel} → ${nextLabel}`);
                    } else {
                      toast.error(err?.message || "Error actualizando estado");
                    }
                  }
                }}
                disabled={updateStatus.isPending}
              >
                Guardar
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowHistory(true)}>
                Historial
              </Button>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Contacto</h2>
          <div className="border rounded p-3 text-sm h-full">
            {address ? (
              <div className="space-y-1">
                <div><span className="font-medium">Dirección:</span> {address.address}</div>
                {address.address_line_2 && (<div><span className="font-medium">Dirección 2:</span> {address.address_line_2}</div>)}
                {address.recipient_name && (<div><span className="font-medium">Destinatario:</span> {address.recipient_name}</div>)}
                {address.phone && (<div><span className="font-medium">Teléfono:</span> {address.phone}</div>)}
                {typeof address.is_default === "boolean" && (
                  <div><span className="font-medium">Predeterminada:</span> {address.is_default ? "Sí" : "No"}</div>
                )}
                {(address.department_name || address.department_id) && (
                  <div><span className="font-medium">Departamento:</span> {address.department_name ?? address.department_id}</div>
                )}
                <div className="text-xs text-muted-foreground mt-2">Creado: {address.created_at ?? address.updated_at}</div>
              </div>
            ) : (
              <div className="text-muted-foreground">No hay snapshot de dirección para esta orden</div>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold flex justify-between items-center">
            Comprobante de pago
            {proofUrl && (
              <Button variant="secondary" size="sm" onClick={() => setShowProof(true)}>
                Ver más grande
              </Button>
            )}
          </h2>
          <div className="border rounded p-3 text-sm h-full relative group">
            {proofUrl ? (
              <div className="flex flex-col items-center justify-center gap-2">
                <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                  Abrir URL original
                </a>
                {isImageProof && !proofError ? (
                  <img
                    src={proofUrl}
                    alt="Comprobante de pago"
                    className="max-h-48 rounded shadow-sm object-contain cursor-pointer transition-transform group-hover:scale-105"
                    onError={() => setProofError(true)}
                    onClick={() => setShowProof(true)}
                  />
                ) : (
                  <div className="text-muted-foreground text-xs text-center">
                    {proofError ? "No se pudo cargar la imagen." : "Vista previa no disponible."}
                    <br /> Usa el enlace para abrir el comprobante.
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted-foreground text-center pt-8">Sin comprobante adjunto</div>
            )}
          </div>
        </section>
      </div>

      <section className="space-y-4 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Items</h2>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={handleEditToggle} className="flex items-center gap-2">
              <Edit size={16} /> Editar Orden
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleEditToggle} className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50">
                <X size={16} /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSaveDetails} disabled={updateOrderDetails.isPending} className="flex items-center gap-2">
                <Save size={16} /> {updateOrderDetails.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          )}
        </div>

        <div className="border rounded shadow-sm overflow-hidden bg-white">
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-3 font-semibold text-slate-600">Producto</th>
                <th className="text-left p-3 font-semibold text-slate-600">SKU</th>
                <th className="text-left p-3 font-semibold text-slate-600">Precio Unit.</th>
                <th className="text-left p-3 font-semibold text-slate-600 w-32">Cantidad</th>
                <th className="text-left p-3 font-semibold text-slate-600 text-right">Subtotal</th>
                {isEditing && <th className="p-3 w-16"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length === 0 ? (
                <tr><td colSpan={isEditing ? 6 : 5} className="p-4 text-center text-muted-foreground">Sin items</td></tr>
              ) : currentItems.map((it: any) => (
                <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-3 font-medium text-slate-900">{getItemName(it)}</td>
                  <td className="p-3 text-slate-600">{getItemSku(it)}</td>
                  <td className="p-3">
                    {isEditing ? (
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                        <Input
                          type="number"
                          className="w-24 pl-6"
                          value={getItemUnitPrice(it)}
                          onChange={(e) => handlePriceChange(it.id, parseFloat(e.target.value) || 0)}
                          step="0.01"
                          min="0"
                        />
                      </div>
                    ) : (
                      `$${getItemUnitPrice(it).toFixed(2)}`
                    )}
                  </td>
                  <td className="p-3">
                    {isEditing ? (
                      <Input
                        type="number"
                        className="w-20"
                        value={it.quantity}
                        onChange={(e) => handleQuantityChange(it.id, parseInt(e.target.value) || 1)}
                        min="1"
                      />
                    ) : (
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-slate-100 text-slate-800 text-sm font-medium">
                        {it.quantity}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-medium">
                    ${(getItemUnitPrice(it) * Number(it.quantity)).toFixed(2)}
                  </td>
                  {isEditing && (
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemoveItem(it.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </section>

      <section className="flex justify-end pt-4">
        <div className="border rounded p-4 text-sm w-full md:w-80 space-y-3 bg-slate-50">
          <div className="flex justify-between items-center text-slate-600">
            <span>Subtotal:</span>
            <span className="font-medium text-slate-900">${currentSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-600">
            <span>Envío:</span>
            {isEditing ? (
              <div className="relative w-24">
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  className="pl-6 h-8 text-right"
                  value={editedShipping}
                  onChange={(e) => setEditedShipping(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                />
              </div>
            ) : (
              <span className="font-medium text-slate-900">${currentShipping.toFixed(2)}</span>
            )}
          </div>
          <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between items-center text-lg font-bold text-slate-900">
            <span>Total:</span>
            <span>${currentTotal.toFixed(2)}</span>
          </div>
        </div>
      </section>

      {/* Historial de estado */}
      <HistoryDialog orderId={order.id} open={showHistory} onClose={() => setShowHistory(false)} />
      {/* Comprobante modal */}
      <PaymentProofDialog proofUrl={showProof ? proofUrl : null} onClose={() => setShowProof(false)} />
    </div>
  );
};

export default OrderDetailPage;