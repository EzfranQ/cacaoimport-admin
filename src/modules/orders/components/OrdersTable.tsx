/**
 * Tabla de Órdenes con filtros, cambio de estado e historial.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Table } from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { toast } from "sonner";
import { useOrders, useOrderStatuses, useUpdateOrderStatus } from "../hooks";
import type { Order } from "../hooks/useOrders";
import { supabase } from "@/app/libs/supabase";
import HistoryDialog from "./HistoryDialog";
import PaymentProofDialog from "./PaymentProofDialog";

export default function OrdersTable() {
  const [page, setPage] = useState(1);
  const [statusId, setStatusId] = useState<string | undefined>(undefined);
  const [profileId, setProfileId] = useState<string>("");
  const [historyFor, setHistoryFor] = useState<string | null>(null);
  const [proofUrlFor, setProofUrlFor] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({});

  const { data, isLoading } = useOrders({ page, pageSize: 10, statusId, profileId: profileId || undefined, sortBy: "created_at", sortOrder: "desc" });
  const { data: statuses } = useOrderStatuses();
  const updateMutation = useUpdateOrderStatus();
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
  const items = data?.data ?? [];

  const onChangeStatus = async (order: Order) => {
    const next = pendingStatus[order.id];
    if (!next) {
      toast.warning("Selecciona un estado");
      return;
    }
    try {
      await updateMutation.mutateAsync({ orderId: order.id, statusId: next });
      toast.success("Estado actualizado");
    } catch (err: any) {
      // Mejorar mensaje para transición inválida
      const nextLabel = (statuses ?? []).find((s) => s.id === next)?.label ?? next;
      const currentLabel = order.order_status?.label ?? order.id_status;
      if (typeof err?.message === "string" && err.message.includes("Transición de estado no permitida")) {
        toast.error(`Transición no permitida: ${currentLabel} → ${nextLabel}`);
      } else {
        toast.error(err.message || "Error actualizando estado");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <label className="text-sm">Estado</label>
          {/* Radix Select: los valores de SelectItem no pueden ser "". Usamos "ALL" para representar 'Todos'. */}
          <Select value={statusId ?? "ALL"} onValueChange={(v) => setStatusId(v === "ALL" ? undefined : v)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              {(statuses ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm">Profile ID</label>
          <Input value={profileId} onChange={(e) => setProfileId(e.target.value)} placeholder="Filtrar por profile_id" className="w-64" />
        </div>
      </div>

      <div className="border rounded">
        <Table>
          <thead>
            <tr>
              <th className="text-left p-2">Fecha</th>
              <th className="text-left p-2">Cliente</th>
              <th className="text-left p-2">Subtotal</th>
              <th className="text-left p-2">Envío</th>
              <th className="text-left p-2">Total</th>
              <th className="text-left p-2">Estado</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-4">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-4">Sin resultados</td></tr>
            ) : (
              items.map((o) => (
                <tr key={o.id}>
                  <td className="p-2">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="p-2 text-xs">{o.profile?.full_name ?? o.profile_id}</td>
                  <td className="p-2">{Number(o.subtotal).toFixed(2)}</td>
                  <td className="p-2">{Number(o.shipping).toFixed(2)}</td>
                  <td className="p-2 font-semibold">{Number(o.total).toFixed(2)}</td>
                  <td className="p-2">{o.order_status?.label ?? ""}</td>
                  <td className="p-2">
                    <div className="flex items-center gap-2">
                      {
                        // Limitar opciones a las transiciones permitidas desde el estado actual
                      }
                      <Select value={pendingStatus[o.id] ?? o.id_status} onValueChange={(v) => setPendingStatus((prev) => ({ ...prev, [o.id]: v }))}>
                        <SelectTrigger className="w-52">
                          <SelectValue placeholder="Selecciona estado" />
                        </SelectTrigger>
                        <SelectContent>
                          {/* Mostrar el estado actual como deshabilitado para contexto */}
                          <SelectItem key={`current-${o.id_status}`} value={o.id_status} disabled>
                            {(o.order_status?.label ?? o.id_status) + " (actual)"}
                          </SelectItem>
                          {(() => {
                            const allowed = transitionMap[o.id_status] ?? [];
                            const allowedStatuses = (statuses ?? []).filter((s) => allowed.includes(s.id));
                            return allowedStatuses.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                            ));
                          })()}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={() => onChangeStatus(o)}>Guardar</Button>
                      <Button variant="secondary" onClick={() => setHistoryFor(o.id)}>Historial</Button>
                      {o.payment_proof_url ? (
                        <Button variant="secondary" onClick={() => setProofUrlFor(o.payment_proof_url!)}>Ver comprobante</Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Sin comprobante</span>
                      )}
                      <Link to={`/admin/orders/${o.id}`} className="text-xs underline">Ver detalle</Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span>Página {data?.currentPage ?? 1} de {data?.totalPages ?? 1}</span>
        <Button variant="outline" disabled={!data?.hasNextPage} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
      </div>

      <HistoryDialog orderId={historyFor} onClose={() => setHistoryFor(null)} />
      <PaymentProofDialog proofUrl={proofUrlFor} onClose={() => setProofUrlFor(null)} />
    </div>
  );
}