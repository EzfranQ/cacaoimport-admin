import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Trash2, Search, Users, FilePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Table } from "@/shared/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useClients, useDeleteOldInvoices } from "@/modules/invoices/hooks/useInvoices";

export const ClientsList = () => {
  const navigate = useNavigate();
  const { data: clients = [], isLoading, error } = useClients();
  const deleteOld = useDeleteOldInvoices();

  const [search, setSearch] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone ?? "").toLowerCase().includes(q)
    );
  }, [clients, search]);

  const handleCleanup = async () => {
    try {
      const removed = await deleteOld.mutateAsync();
      toast.success(
        removed > 0
          ? `${removed} factura(s) con más de 6 meses eliminadas`
          : "No había facturas con más de 6 meses"
      );
    } catch (err: any) {
      toast.error(err.message || "Error al limpiar facturas");
    } finally {
      setConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users size={28} /> Clientes
        </h1>
        <Button
          variant="outline"
          onClick={() => setConfirmOpen(true)}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        >
          <Trash2 size={16} /> Eliminar facturas {">"} 6 meses
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          className="pl-8"
          placeholder="Buscar por nombre o teléfono…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="border rounded shadow-sm overflow-hidden bg-white">
        <Table>
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 font-semibold text-slate-600">Cliente</th>
              <th className="text-left p-3 font-semibold text-slate-600">Teléfono</th>
              <th className="text-left p-3 font-semibold text-slate-600 text-center">Facturas</th>
              <th className="text-left p-3 font-semibold text-slate-600 text-right">Total acumulado</th>
              <th className="text-left p-3 font-semibold text-slate-600">Última factura</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Cargando…</td></tr>
            ) : error ? (
              <tr><td colSpan={6} className="p-4 text-center text-red-600">{(error as any)?.message}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sin clientes con facturas</td></tr>
            ) : (
              filtered.map((c) => (
                <tr
                  key={c.key}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/admin/clients/${encodeURIComponent(c.key)}`)}
                >
                  <td className="p-3 font-medium text-slate-900">
                    {c.name}
                    {!c.profileId && (
                      <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">manual</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-600">{c.phone || "-"}</td>
                  <td className="p-3 text-center">{c.invoiceCount}</td>
                  <td className="p-3 text-right font-medium">${c.totalAcum.toFixed(2)}</td>
                  <td className="p-3 text-slate-600">{new Date(c.lastInvoiceAt).toLocaleDateString()}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1.5 ml-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate("/admin/billing", {
                          state: { clientName: c.name, phone: c.phone ?? "" },
                        });
                      }}
                    >
                      <FilePlus size={15} /> Crear factura
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar facturas antiguas</DialogTitle>
            <DialogDescription>
              Se eliminarán <strong>todas</strong> las facturas con más de 6 meses de antigüedad. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleteOld.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleCleanup}
              disabled={deleteOld.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteOld.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClientsList;
