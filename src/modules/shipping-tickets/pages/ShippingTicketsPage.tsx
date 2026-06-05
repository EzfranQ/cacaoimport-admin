/**
 * Tickets de Envío: armás "grupos" (un cliente + cuántas copias) y la hoja A4
 * se genera sola, 5 tickets por hoja. Los espacios sobrantes quedan en blanco
 * para completar a mano. El remitente se guarda en site_settings.
 */
import { useEffect, useState } from "react";
import { Printer, Home, Truck, Smartphone, Eraser, Save, Plus, Minus, X, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useSiteSetting, useUpsertSiteSetting } from "@/modules/site-content/hooks/useSiteSettings";

interface Sender {
  name: string;
  phone: string;
}
interface Ticket {
  destinatario: string;
  direccion: string;
  localidad: string;
  envio: string;
  bultos: string;
  observaciones: string;
}
interface Group {
  id: string;
  ticket: Ticket;
  quantity: number;
}

const EMPTY: Ticket = {
  destinatario: "",
  direccion: "",
  localidad: "",
  envio: "",
  bultos: "",
  observaciones: "",
};
const DEFAULT_SENDER: Sender = { name: "Evenio Gómez", phone: "096 002 668" };
const PER_SHEET = 5;

const newGroup = (): Group => ({ id: crypto.randomUUID(), ticket: { ...EMPTY }, quantity: 1 });

const FIELDS: { key: keyof Ticket; label: string }[] = [
  { key: "destinatario", label: "Destinatario" },
  { key: "direccion", label: "Dirección completa" },
  { key: "localidad", label: "Localidad / Ciudad" },
  { key: "envio", label: "Envío (empresa)" },
  { key: "bultos", label: "Bultos (cantidad)" },
  { key: "observaciones", label: "Observaciones" },
];

const PRINT_CSS = `
@media print {
  @page { size: A4 portrait; margin: 0; }
  body * { visibility: hidden !important; }
  .ship-print, .ship-print * { visibility: visible !important; }
  .ship-print { position: absolute; left: 0; top: 0; width: 210mm; }
  .ship-sheet { break-after: page; box-shadow: none !important; border: 0 !important; }
  .ship-sheet:last-child { break-after: auto; }
  .no-print { display: none !important; }
}
.ship-print { display: flex; flex-direction: column; gap: 16px; align-items: center; }
.ship-sheet {
  width: 210mm;
  height: 297mm;
  padding: 7mm 6mm;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 3mm;
}
.tk {
  flex: 1 1 0;
  border: 1.4px solid #111827;
  border-radius: 7px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: ui-sans-serif, system-ui, sans-serif;
  color: #111827;
  background: #fff;
}
.tk-accent { height: 4px; background: #32adfe; }
.tk-title {
  text-align: center; font-weight: 700; font-size: 14px; letter-spacing: 2px;
  padding: 4px 0; border-bottom: 1.4px solid #111827;
}
.tk-body { flex: 1; display: flex; flex-direction: column; }
.tk-row { display: flex; align-items: center; gap: 6px; padding: 0 10px; flex: 1; border-bottom: 1px solid #e5e7eb; }
.tk-label { font-size: 12px; font-weight: 600; white-space: nowrap; display: flex; align-items: center; gap: 4px; }
.tk-line { flex: 1; border-bottom: 1px dotted #9ca3af; font-size: 12px; padding: 2px 2px 1px; min-width: 0; min-height: 16px; }
.tk-split { display: flex; flex: 1; }
.tk-split > .tk-row:first-child { border-right: 1px solid #e5e7eb; }
.tk-bottom { display: flex; flex: 1.25; border-top: 1.4px solid #111827; }
.tk-bottom-left { flex: 1.1; display: flex; flex-direction: column; }
.tk-bultos .tk-label { font-size: 15px; font-weight: 700; }
.tk-box { width: 64px; text-align: center; font-size: 18px; font-weight: 700; }
.tk-sender {
  flex: 1; background: #f1f3f5; border-left: 1.4px solid #111827; padding: 6px 12px;
  display: flex; flex-direction: column; justify-content: center; gap: 1px;
  -webkit-print-color-adjust: exact; print-color-adjust: exact;
}
.tk-sender-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.tk-sender-cap { font-size: 12px; font-weight: 600; }
.tk-sender-name { font-size: 16px; font-weight: 800; text-align: right; }
.tk-sender-sub { font-size: 9px; color: #6b7280; text-align: right; margin-top: -2px; }
.tk-sender-phone { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; margin-top: 4px; }
.tk-sender-phone b { font-size: 16px; font-weight: 800; }
`;

function TicketView({ ticket, sender }: { ticket: Ticket; sender: Sender }) {
  return (
    <div className="tk">
      <div className="tk-accent" />
      <div className="tk-title">RECIBO DESTINATARIO</div>
      <div className="tk-body">
        <div className="tk-row">
          <span className="tk-label">Destinatario:</span>
          <span className="tk-line">{ticket.destinatario}</span>
        </div>
        <div className="tk-row">
          <span className="tk-label">
            Dirección Completa <Home size={13} />
          </span>
          <span className="tk-line">{ticket.direccion}</span>
        </div>
        <div className="tk-split">
          <div className="tk-row">
            <span className="tk-label">Localidad/Ciudad:</span>
            <span className="tk-line">{ticket.localidad}</span>
          </div>
          <div className="tk-row">
            <span className="tk-label">
              Envío <Truck size={13} />
            </span>
            <span className="tk-line">{ticket.envio}</span>
          </div>
        </div>
        <div className="tk-bottom">
          <div className="tk-bottom-left">
            <div className="tk-row tk-bultos">
              <span className="tk-label">Bultos (cantidad):</span>
              <span className="tk-box">{ticket.bultos}</span>
            </div>
            <div className="tk-row" style={{ borderBottom: 0 }}>
              <span className="tk-label">Observaciones:</span>
              <span className="tk-line">{ticket.observaciones}</span>
            </div>
          </div>
          <div className="tk-sender">
            <div className="tk-sender-row">
              <span className="tk-sender-cap">Remitente:</span>
              <div>
                <div className="tk-sender-name">{sender.name}</div>
                <div className="tk-sender-sub">Remitente Registrado</div>
              </div>
            </div>
            <div className="tk-sender-phone">
              <Smartphone size={14} /> Celular: <b>{sender.phone}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const ShippingTicketsPage = () => {
  const { data: savedSender } = useSiteSetting<Sender>("shipping_sender");
  const upsert = useUpsertSiteSetting();

  const [sender, setSender] = useState<Sender>(DEFAULT_SENDER);
  const [groups, setGroups] = useState<Group[]>([newGroup()]);

  useEffect(() => {
    if (savedSender) {
      setSender({
        name: savedSender.name || DEFAULT_SENDER.name,
        phone: savedSender.phone || DEFAULT_SENDER.phone,
      });
    }
  }, [savedSender]);

  const updateField = (id: string, field: keyof Ticket, val: string) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, ticket: { ...g.ticket, [field]: val } } : g)));
  const setQty = (id: string, qty: number) =>
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, quantity: Math.min(50, Math.max(1, qty)) } : g)));
  const addGroup = () => setGroups((prev) => [...prev, newGroup()]);
  const removeGroup = (id: string) => setGroups((prev) => (prev.length > 1 ? prev.filter((g) => g.id !== id) : prev));
  const clearAll = () => setGroups([newGroup()]);

  const saveSender = async () => {
    try {
      await upsert.mutateAsync({ key: "shipping_sender", value: sender });
      toast.success("Remitente guardado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Expandir grupos → tickets individuales, paginar de a 5 y rellenar con blancos
  const expanded: Ticket[] = groups.flatMap((g) => Array.from({ length: g.quantity }, () => g.ticket));
  const sheetCount = Math.max(1, Math.ceil(expanded.length / PER_SHEET));
  const padded = [...expanded];
  while (padded.length < sheetCount * PER_SHEET) padded.push(EMPTY);
  const sheets: Ticket[][] = [];
  for (let i = 0; i < padded.length; i += PER_SHEET) sheets.push(padded.slice(i, i + PER_SHEET));

  return (
    <div className="space-y-6">
      <style>{PRINT_CSS}</style>

      <div className="no-print space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Tickets de Envío</h1>
            <p className="text-muted-foreground text-sm">
              Completá un ticket, elegí cuántas copias y agregá los que necesites. 5 por hoja A4.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={clearAll}>
              <Eraser className="size-4 mr-1" /> Limpiar
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="size-4 mr-1" /> Imprimir
            </Button>
          </div>
        </div>

        {/* Remitente */}
        <div className="rounded-lg border p-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end bg-muted/30">
          <div className="space-y-1.5">
            <Label>Remitente</Label>
            <Input value={sender.name} onChange={(e) => setSender((s) => ({ ...s, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Celular</Label>
            <Input value={sender.phone} onChange={(e) => setSender((s) => ({ ...s, phone: e.target.value }))} />
          </div>
          <Button variant="secondary" onClick={saveSender} disabled={upsert.isPending}>
            <Save className="size-4 mr-1" /> Guardar remitente
          </Button>
        </div>

        {/* Grupos de tickets */}
        <div className="space-y-3">
          {groups.map((g, idx) => (
            <div key={g.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {g.ticket.destinatario?.trim() || `Ticket ${idx + 1}`}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {g.quantity} {g.quantity === 1 ? "copia" : "copias"}
                  </span>
                </p>
                {groups.length > 1 && (
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeGroup(g.id)} title="Quitar">
                    <X className="size-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <Input
                      value={g.ticket[f.key]}
                      onChange={(e) => updateField(g.id, f.key, e.target.value)}
                      placeholder={f.label}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Label className="text-sm">Cantidad de copias</Label>
                <div className="flex items-center">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-r-none" onClick={() => setQty(g.id, g.quantity - 1)}>
                    <Minus className="size-4" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={g.quantity}
                    onChange={(e) => setQty(g.id, Number(e.target.value) || 1)}
                    className="h-8 w-16 rounded-none text-center"
                  />
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-l-none" onClick={() => setQty(g.id, g.quantity + 1)}>
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" onClick={addGroup}>
            <Copy className="size-4 mr-1" /> Agregar otro ticket / cliente
          </Button>
        </div>

        {/* Resumen */}
        <div className="rounded-lg border bg-blue-50/60 px-4 py-3 text-sm">
          <span className="font-semibold">{expanded.length}</span> ticket(s) con datos ·{" "}
          <span className="font-semibold">{sheetCount}</span> hoja(s) A4 ({sheetCount * PER_SHEET} espacios).
          {expanded.length < sheetCount * PER_SHEET && (
            <span className="text-muted-foreground"> Los {sheetCount * PER_SHEET - expanded.length} espacio(s) restante(s) quedan en blanco para completar a mano.</span>
          )}
        </div>

        <p className="text-sm font-medium text-muted-foreground border-t pt-4">Vista previa (así se imprime):</p>
      </div>

      {/* Hojas A4 imprimibles */}
      <div className="ship-print">
        {sheets.map((sheet, si) => (
          <div key={si} className="ship-sheet shadow-lg border">
            {sheet.map((t, ti) => (
              <TicketView key={ti} ticket={t} sender={sender} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
