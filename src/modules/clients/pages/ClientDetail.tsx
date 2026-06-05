import { useState } from "react";
import { useParams, Link } from "react-router";
import { toast } from "sonner";
import { Download, Edit, Save, X, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Table } from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { ProductSearchInput } from "@/modules/orders/components/ProductSearchInput";
import { generateInvoicePDF } from "@/modules/orders/utils/pdf";
import type { Product } from "@/modules/products/hooks/useProducts";
import {
  useInvoicesByClient,
  useUpdateInvoice,
  useDeleteInvoice,
  type Invoice,
  type InvoiceItem,
} from "@/modules/invoices/hooks/useInvoices";

const itemsTotal = (items: InvoiceItem[]) =>
  items.reduce((acc, it) => acc + Number(it.unit_price) * Number(it.quantity), 0);

const InvoiceCard = ({ invoice }: { invoice: Invoice }) => {
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();

  const [isEditing, setIsEditing] = useState(false);
  const [editedItems, setEditedItems] = useState<InvoiceItem[]>(invoice.items ?? []);

  const currentItems = isEditing ? editedItems : invoice.items ?? [];
  const subtotal = itemsTotal(currentItems);

  const handleEditToggle = () => {
    if (!isEditing) {
      setEditedItems(JSON.parse(JSON.stringify(invoice.items ?? [])));
    }
    setIsEditing(!isEditing);
  };

  const handleQuantityChange = (idx: number, qty: number) =>
    setEditedItems((prev) => prev.map((it, i) => (i === idx ? { ...it, quantity: Math.max(1, qty) } : it)));

  const handlePriceChange = (idx: number, price: number) =>
    setEditedItems((prev) => prev.map((it, i) => (i === idx ? { ...it, unit_price: Math.max(0, price) } : it)));

  const handleRemove = (idx: number) =>
    setEditedItems((prev) => prev.filter((_, i) => i !== idx));

  const handleAddProduct = (product: Product) =>
    setEditedItems((prev) => [
      ...prev,
      { name: product.name, sku: product.sku ?? null, unit_price: Number(product.price), quantity: 1 },
    ]);

  const handleSave = async () => {
    const newSubtotal = itemsTotal(editedItems);
    try {
      await updateInvoice.mutateAsync({
        id: invoice.id,
        patch: { items: editedItems, subtotal: newSubtotal, total: newSubtotal },
      });
      toast.success("Factura actualizada");
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || "Error al actualizar la factura");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("¿Eliminar esta factura? Esta acción no se puede deshacer.")) return;
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      toast.success("Factura eliminada");
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar la factura");
    }
  };

  const handlePDF = () =>
    generateInvoicePDF(
      {
        id: invoice.id,
        created_at: invoice.created_at,
        subtotal,
        total: subtotal,
        profile: { full_name: invoice.client_name },
        address: invoice.address ?? undefined,
        items: currentItems,
      },
      invoice.seller ?? undefined,
      invoice.payment_methods ? invoice.payment_methods.split(",") : undefined,
      invoice.delivered
    );

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">
            Factura #{invoice.id}
            {invoice.order_id && <span className="ml-2 text-xs text-muted-foreground">(pedido)</span>}
            {!invoice.profile_id && (
              <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">manual</span>
            )}
          </CardTitle>
          <div className="text-xs text-muted-foreground mt-1 space-x-3">
            <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
            {invoice.seller && <span>Vendedor: {invoice.seller}</span>}
            {invoice.payment_methods && <span>Pago: {invoice.payment_methods}</span>}
            {invoice.delivered && <span className="text-green-600 font-medium">Entregado</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={handleEditToggle} className="flex items-center gap-1">
                <Edit size={14} /> Editar
              </Button>
              <Button variant="outline" size="sm" onClick={handlePDF} className="flex items-center gap-1">
                <Download size={14} /> PDF
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={handleDelete}
                disabled={deleteInvoice.isPending}
              >
                <Trash2 size={16} />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleEditToggle} className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50">
                <X size={14} /> Cancelar
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateInvoice.isPending} className="flex items-center gap-1">
                <Save size={14} /> {updateInvoice.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEditing && (
          <div className="max-w-md">
            <ProductSearchInput onSelect={handleAddProduct} />
          </div>
        )}
        <div className="border rounded overflow-hidden bg-white">
          <Table>
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2 font-semibold text-slate-600">Producto</th>
                <th className="text-left p-2 font-semibold text-slate-600">SKU</th>
                <th className="text-left p-2 font-semibold text-slate-600 w-28">Precio</th>
                <th className="text-left p-2 font-semibold text-slate-600 w-24">Cant.</th>
                <th className="text-right p-2 font-semibold text-slate-600">Subtotal</th>
                {isEditing && <th className="p-2 w-12"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length === 0 ? (
                <tr><td colSpan={isEditing ? 6 : 5} className="p-3 text-center text-muted-foreground">Sin ítems</td></tr>
              ) : (
                currentItems.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2 font-medium text-slate-900">{it.name}</td>
                    <td className="p-2 text-slate-600">{it.sku || "-"}</td>
                    <td className="p-2">
                      {isEditing ? (
                        <Input
                          type="number" min="0" step="0.01"
                          className="w-24"
                          value={it.unit_price}
                          onChange={(e) => handlePriceChange(idx, parseFloat(e.target.value) || 0)}
                        />
                      ) : (
                        `$${Number(it.unit_price).toFixed(2)}`
                      )}
                    </td>
                    <td className="p-2">
                      {isEditing ? (
                        <Input
                          type="number" min="1"
                          className="w-20"
                          value={it.quantity}
                          onChange={(e) => handleQuantityChange(idx, parseInt(e.target.value) || 1)}
                        />
                      ) : (
                        it.quantity
                      )}
                    </td>
                    <td className="p-2 text-right font-medium">
                      ${(Number(it.unit_price) * Number(it.quantity)).toFixed(2)}
                    </td>
                    {isEditing && (
                      <td className="p-2 text-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleRemove(idx)}>
                          <Trash2 size={14} />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </div>
        <div className="flex justify-end">
          <div className="text-right text-sm">
            <span className="text-slate-600 mr-3">Total:</span>
            <span className="text-lg font-bold">${subtotal.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const ClientDetail = () => {
  const { clientKey = "" } = useParams();
  const decodedKey = decodeURIComponent(clientKey);
  const { data: invoices = [], isLoading, error } = useInvoicesByClient(decodedKey);

  const client = invoices[0];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{client?.client_name ?? "Cliente"}</h1>
          {client?.client_phone && (
            <p className="text-sm text-muted-foreground">Tel: {client.client_phone}</p>
          )}
        </div>
        <Link to="/admin/clients">
          <Button variant="outline">Volver a clientes</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Cargando…</div>
      ) : error ? (
        <div className="text-red-600">{(error as any)?.message}</div>
      ) : invoices.length === 0 ? (
        <div className="text-muted-foreground">Este cliente no tiene facturas.</div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Historial de facturas ({invoices.length})</h2>
          {invoices.map((inv) => (
            <InvoiceCard key={inv.id} invoice={inv} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
