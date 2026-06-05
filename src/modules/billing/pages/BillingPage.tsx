import { useState } from "react";
import { useLocation } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { Table } from "@/shared/components/ui/table";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/shared/components/ui/select";
import { generateInvoicePDF } from "@/modules/orders/utils/pdf";
import { Trash2, Download, Plus, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/shared/components/ui/card";
import { ProductSearchInput } from "@/modules/orders/components/ProductSearchInput";
import type { Product } from "@/modules/products/hooks/useProducts";
import { useCreateInvoice } from "@/modules/invoices/hooks/useInvoices";
import { toast } from "sonner";

export const BillingPage = () => {
  // Datos precargados al venir desde la lista de Clientes ("Crear factura").
  const location = useLocation();
  const prefill = (location.state ?? {}) as { clientName?: string; phone?: string };

  const [clientName, setClientName] = useState(prefill.clientName ?? "");
  const [address, setAddress] = useState("");
  const [address2, setAddress2] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState(prefill.phone ?? "");

  const [items, setItems] = useState<any[]>([]);
  const [seller, setSeller] = useState<string | undefined>(undefined);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["Efectivo", "Transferencia", "Crédito"]);
  const [delivered, setDelivered] = useState(true);
  // Se activa tras guardar una factura, para ofrecer crear otra del mismo cliente.
  const [canRepeat, setCanRepeat] = useState(false);

  const createInvoice = useCreateInvoice();

  const PAYMENT_OPTIONS = ["Efectivo", "Transferencia", "Crédito"];

  // Limpia solo los artículos y conserva los datos del cliente (nombre, teléfono,
  // dirección, vendedor y forma de cobro) para facturar de nuevo al mismo usuario.
  const startNewInvoiceSameClient = () => {
    setItems([]);
    setCanRepeat(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.info(`Nueva factura para ${clientName.trim() || "el mismo cliente"}`);
  };

  const togglePaymentMethod = (method: string) => {
    setPaymentMethods(prev =>
      prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
    );
  };

  const handleAddItem = () => {
    setItems([...items, { id: Date.now().toString(), name: "", sku: "", price: 0, quantity: 1 }]);
  };

  const handleAddProductFromSearch = (product: Product) => {
    setItems(prev => [
      ...prev,
      {
        id: Date.now().toString(),
        name: product.name,
        sku: product.sku ?? "",
        price: Number(product.price),
        quantity: 1,
      },
    ]);
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter((it) => it.id !== id));
  };

  const subtotal = items.reduce((acc, it) => acc + Number(it.price) * Number(it.quantity), 0);
  const total = subtotal;

  const handleGeneratePDF = () => {
    const orderMock = {
      id: "MANUAL-" + Date.now().toString().slice(-4),
      created_at: new Date().toISOString(),
      total: total,
      subtotal: subtotal,
      profile: {
        full_name: clientName || "Desconocido",
      },
      address: {
        address: address,
        address_line_2: address2,
        department_name: department,
        phone: phone,
      },
      items: items.map(it => ({
        name: it.name || "Artículo sin nombre",
        sku: it.sku || undefined,
        quantity: it.quantity,
        unit_price: it.price,
      }))
    };

    generateInvoicePDF(orderMock, seller, paymentMethods, delivered);
  };

  const handleSaveInvoice = async () => {
    if (!clientName.trim()) {
      toast.warning("Ingresa el nombre del cliente");
      return;
    }
    if (items.length === 0) {
      toast.warning("Agrega al menos un artículo");
      return;
    }
    try {
      await createInvoice.mutateAsync({
        client_name: clientName.trim(),
        client_phone: phone || null,
        profile_id: null,
        order_id: null,
        seller: seller ?? null,
        payment_methods: paymentMethods.length ? paymentMethods.join(",") : null,
        delivered,
        subtotal,
        total,
        address: {
          address: address || null,
          address_line_2: address2 || null,
          department_name: department || null,
          phone: phone || null,
        },
        items: items.map((it) => ({
          name: it.name || "Artículo sin nombre",
          sku: it.sku || null,
          quantity: Number(it.quantity),
          unit_price: Number(it.price),
        })),
      });
      setCanRepeat(true);
      toast.success("Factura guardada", {
        action: {
          label: "Otra del mismo cliente",
          onClick: startNewInvoiceSameClient,
        },
      });
    } catch (err: any) {
      toast.error(err.message || "Error al guardar la factura");
    }
  };

  return (
    <div className="space-y-6 pb-20 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          Facturación Manual
        </h1>
        <div className="flex items-center gap-2">
          <Select value={seller} onValueChange={setSeller}>
            <SelectTrigger className="w-[120px] h-9">
              <SelectValue placeholder="Vendedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Axel">Axel</SelectItem>
              <SelectItem value="Evenio">Evenio</SelectItem>
              <SelectItem value="Alejandro">Alejandro</SelectItem>
            </SelectContent>
          </Select>
          {canRepeat && (
            <Button onClick={startNewInvoiceSameClient} variant="secondary" className="flex items-center gap-2 h-9">
              <Plus size={16} /> Otra factura (mismo cliente)
            </Button>
          )}
          <Button onClick={handleSaveInvoice} variant="outline" className="flex items-center gap-2 h-9" disabled={items.length === 0 || createInvoice.isPending}>
            <Save size={16} /> {createInvoice.isPending ? "Guardando..." : "Guardar factura"}
          </Button>
          <Button onClick={handleGeneratePDF} className="flex items-center gap-2 h-9" disabled={items.length === 0}>
            <Download size={16} /> Descargar PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cliente a Cobrar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre Completo</label>
              <Input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Ej. Juan Pérez" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej. +1 234 567 8900" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Dirección de Envío</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dirección Principal</label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ej. Calle 123" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Detalles (Opcional)</label>
              <Input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="Ej. Apto 4B" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Departamento / Ciudad</label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Ej. Montevideo" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Forma de Cobro y Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Método de pago</label>
            <div className="flex gap-4 flex-wrap">
              {PAYMENT_OPTIONS.map((method) => (
                <label key={method} className="flex items-center gap-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={paymentMethods.includes(method)}
                    onChange={() => togglePaymentMethod(method)}
                    className="w-4 h-4"
                  />
                  {method}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <input
                type="checkbox"
                checked={delivered}
                onChange={(e) => setDelivered(e.target.checked)}
                className="w-4 h-4"
              />
              Marcar como Entregado
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Artículos</CardTitle>
          <Button variant="outline" size="sm" onClick={handleAddItem} className="flex items-center gap-2">
            <Plus size={16} /> Agregar Manual
          </Button>
        </CardHeader>
        <div className="px-6 pb-2">
          <ProductSearchInput onSelect={handleAddProductFromSearch} />
        </div>
        <CardContent>
          <div className="border rounded shadow-sm overflow-hidden bg-white">
            <Table>
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-600">Descripción</th>
                  <th className="text-left p-3 font-semibold text-slate-600 w-32">Precio Unit.</th>
                  <th className="text-left p-3 font-semibold text-slate-600 w-24">Cantidad</th>
                  <th className="text-left p-3 font-semibold text-slate-600 text-right">Monto</th>
                  <th className="p-3 w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No hay artículos agregados</td></tr>
                ) : items.map((it) => (
                  <tr key={it.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <Input value={it.name} onChange={(e) => handleItemChange(it.id, "name", e.target.value)} placeholder="Nombre del producto" />
                      {it.sku && <span className="text-xs text-muted-foreground mt-0.5 block">SKU: {it.sku}</span>}
                    </td>
                    <td className="p-3">
                      <Input type="number" min="0" step="0.01" value={it.price} onChange={(e) => handleItemChange(it.id, "price", parseFloat(e.target.value) || 0)} />
                    </td>
                    <td className="p-3">
                      <Input type="number" min="1" value={it.quantity} onChange={(e) => handleItemChange(it.id, "quantity", parseInt(e.target.value) || 1)} />
                    </td>
                    <td className="p-3 text-right font-medium text-slate-700 pt-5">
                      ${(it.price * it.quantity).toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 mt-1" onClick={() => handleRemoveItem(it.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end pt-4">
          <div className="border rounded p-4 text-sm w-full md:w-80 space-y-3 bg-slate-50">
            <div className="flex justify-between items-center text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-900">${subtotal.toFixed(2)}</span>
            </div>
            {/* <div className="flex justify-between items-center text-slate-600">
              <span>Envío (Opcional):</span>
              <Input
                type="number"
                className="w-24 h-8 text-right bg-white"
                value={shipping}
                onChange={(e) => setShipping(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0"
              />
            </div> */}
            <div className="border-t border-slate-200 mt-2 pt-2 flex justify-between items-center text-lg font-bold text-slate-900">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
