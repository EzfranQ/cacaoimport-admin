import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { useOrderHistory, useUpdateOrderStatus, useOrderStatuses } from "../hooks";
import { toast } from "sonner";

type Props = {
  orderId: string | null;
  open?: boolean;
  onClose: () => void;
};

export default function HistoryDialog({ orderId, open, onClose }: Props) {
  const isOpen = open !== undefined ? open : !!orderId;
  const { data: history, isLoading } = useOrderHistory(orderId ?? "");
  const updateMutation = useUpdateOrderStatus();
  const { data: statuses = [] } = useOrderStatuses();

  return (
    <Dialog open={isOpen}>
      <DialogContent onInteractOutside={onClose} onEscapeKeyDown={onClose}>
        <DialogHeader>
          <DialogTitle>Historial de estado</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="p-4">Cargando...</div>
        ) : (history ?? []).length === 0 ? (
          <div className="p-4">Sin cambios registrados</div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {(history ?? []).map((h: any, i: number) => {
              const label = h.order_status?.label ?? "Estado desconocido";
              const date = new Date(h.changed_at).toLocaleString();
              const opacity = i === 0 ? 1 : Math.max(0.5, 1 - i * 0.12);
              const targetStatusId = h.status_id as string;
              const onRevert = async () => {
                if (!orderId) return;
                try {
                  await updateMutation.mutateAsync({ orderId, statusId: targetStatusId });
                  toast.success("Estado revertido");
                  onClose();
                } catch (err: any) {
                  const nextLabel = (statuses ?? []).find((s) => s.id === targetStatusId)?.label ?? targetStatusId;
                  if (typeof err?.message === "string" && err.message.includes("Transición de estado no permitida")) {
                    toast.error(`No permitido revertir a: ${nextLabel}`);
                  } else {
                    toast.error(err?.message || "Error revirtiendo estado");
                  }
                }
              };
              return (
                <div
                  key={h.id}
                  className="flex items-center justify-between border rounded p-2"
                >
                  {/* Aplica degradado a contenido textual, no al botón */}
                  <div className="font-medium flex items-center gap-2" style={{ opacity }}>
                    {label}
                    {i === 0 && (
                      <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border">Actual</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm" style={{ opacity }}>{date}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRevert}
                      disabled={i === 0 || updateMutation.isPending}
                    >
                      Revertir
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="pt-2">
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}