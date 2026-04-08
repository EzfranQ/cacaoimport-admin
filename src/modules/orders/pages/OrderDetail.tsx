import { useParams, Link } from "react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Table } from "@/shared/components/ui/table";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/components/ui/select";
import { useOrder, useOrderStatuses, useUpdateOrderStatus } from "../hooks/useOrders";
import { supabase } from "@/app/libs/supabase";
import { toast } from "sonner";
import HistoryDialog from "../components/HistoryDialog";
import PaymentProofDialog from "../components/PaymentProofDialog";

export const OrderDetailPage = () => {
  const { id } = useParams();
  const { data: order, isLoading, error } = useOrder(id || "");
  const { data: statuses = [] } = useOrderStatuses();
  const updateStatus = useUpdateOrderStatus();
  const [pendingStatus, setPendingStatus] = useState<string | undefined>(undefined);
  const [showHistory, setShowHistory] = useState(false);
  const [showProof, setShowProof] = useState(false);
  // Los hooks deben declararse siempre, no después de returns condicionales
  const [proofError, setProofError] = useState(false);

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

  const items = (order as any).items ?? [];
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orden {order.id}</h1>
        <Link to="/admin/orders"><Button variant="outline">Volver al listado</Button></Link>
      </div>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Cliente</h2>
        <div className="border rounded p-3 text-sm">
          <div><span className="font-medium">Nombre:</span> {order.profile?.full_name ?? "Desconocido"}</div>
          <div><span className="font-medium">Profile ID:</span> {order.profile_id}</div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Estado</h2>
        <div className="border rounded p-3 text-sm flex items-center gap-3">
          <div>
            <span className="font-medium">Actual:</span> {order.order_status?.label ?? order.id_status}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Cambiar a:</span>
            {
              // Limitar opciones a las transiciones permitidas desde el estado actual
            }
            <Select
              value={pendingStatus ?? order.id_status}
              onValueChange={(value) => setPendingStatus(value)}
              disabled={updateStatus.isPending || statuses.length === 0}
            >
              <SelectTrigger size="sm">
                <SelectValue placeholder="Seleccionar estado" />
              </SelectTrigger>
              <SelectContent>
                {/* Mostrar el estado actual como deshabilitado para contexto */}
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
            <Button variant="secondary" size="sm" onClick={() => setShowHistory(true)}>Historial</Button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Contacto</h2>
        <div className="border rounded p-3 text-sm">
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
              <div className="text-xs text-muted-foreground">Creado: {address.created_at ?? address.updated_at}</div>
            </div>
          ) : (
            <div className="text-muted-foreground">No hay snapshot de dirección para esta orden</div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Comprobante de pago</h2>
        <div className="border rounded p-3 text-sm">
          {proofUrl ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">Abrir en nueva pestaña</a>
                <span className="text-xs text-muted-foreground">URL de origen</span>
                <Button variant="secondary" size="sm" onClick={() => setShowProof(true)}>Ver comprobante</Button>
              </div>
              {isImageProof && !proofError ? (
                <img
                  src={proofUrl}
                  alt="Comprobante de pago"
                  className="max-h-64 rounded border"
                  onError={() => setProofError(true)}
                />
              ) : (
                <div className="text-muted-foreground text-xs">
                  {proofError ? "No se pudo cargar la imagen. Usa el enlace para abrir el comprobante." : "Vista previa no disponible. Usa el enlace para abrir el comprobante."}
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted-foreground">Sin comprobante adjunto</div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Items</h2>
        <div className="border rounded">
          <Table>
            <thead>
              <tr>
                <th className="text-left p-2">Producto</th>
                <th className="text-left p-2">SKU</th>
                <th className="text-left p-2">Cantidad</th>
                <th className="text-left p-2">Precio</th>
                <th className="text-left p-2">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={5} className="p-3">Sin items</td></tr>
              ) : items.map((it: any) => (
                <tr key={it.id}>
                  <td className="p-2">{getItemName(it)}</td>
                  <td className="p-2">{getItemSku(it)}</td>
                  <td className="p-2">{it.quantity}</td>
                  <td className="p-2">{getItemUnitPrice(it).toFixed(2)}</td>
                  <td className="p-2">{(getItemUnitPrice(it) * Number(it.quantity)).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Totales</h2>
        <div className="border rounded p-3 text-sm">
          <div><span className="font-medium">Subtotal:</span> {Number(order.subtotal ?? 0).toFixed(2)}</div>
          <div><span className="font-medium">Envío:</span> {Number(order.shipping ?? 0).toFixed(2)}</div>
          <div className="font-semibold"><span className="font-medium">Total:</span> {Number(order.total ?? 0).toFixed(2)}</div>
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