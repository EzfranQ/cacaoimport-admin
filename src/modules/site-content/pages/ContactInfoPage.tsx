/**
 * Página: editar Dirección, Horarios de atención y el mapa de Google
 * que aparecen en la página de Contacto del sitio.
 * Se guarda en site_settings (key="contact").
 */
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useSiteSetting, useUpsertSiteSetting } from "../hooks/useSiteSettings";

interface HourRow {
  label: string;
  value: string;
}
export interface ContactInfo {
  addressLines: string[];
  mapsLink: string;
  hours: HourRow[];
}

const DEFAULT: ContactInfo = {
  addressLines: ["Barrio de los Judíos", "Montevideo, Uruguay"],
  mapsLink: "https://maps.app.goo.gl/FTH1AmUQXJHybP9s8",
  hours: [
    { label: "Lunes a Viernes", value: "9:00 – 17:00" },
    { label: "Sábado", value: "9:00 – 13:00" },
    { label: "Domingo", value: "Cerrado" },
  ],
};

export const ContactInfoPage = () => {
  const { data, isLoading } = useSiteSetting<ContactInfo>("contact");
  const upsert = useUpsertSiteSetting();

  const [addressText, setAddressText] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [hours, setHours] = useState<HourRow[]>([]);

  useEffect(() => {
    const c = data ?? DEFAULT;
    setAddressText((c.addressLines ?? []).join("\n"));
    setMapsLink(c.mapsLink ?? "");
    setHours(c.hours ?? []);
  }, [data]);

  const updateHour = (i: number, field: keyof HourRow, val: string) =>
    setHours((prev) => prev.map((h, idx) => (idx === i ? { ...h, [field]: val } : h)));
  const addHour = () => setHours((prev) => [...prev, { label: "", value: "" }]);
  const removeHour = (i: number) => setHours((prev) => prev.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    const value: ContactInfo = {
      addressLines: addressText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      mapsLink: mapsLink.trim(),
      hours: hours
        .map((h) => ({ label: h.label.trim(), value: h.value.trim() }))
        .filter((h) => h.label || h.value),
    };
    try {
      await upsert.mutateAsync({ key: "contact", value });
      toast.success("Datos de contacto guardados");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Dirección y horarios</h1>
        <p className="text-muted-foreground text-sm">
          Datos que aparecen en la página de Contacto del sitio.
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Dirección y mapa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Dirección (una línea por renglón)</Label>
                <Textarea
                  rows={3}
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder={"Barrio de los Judíos\nMontevideo, Uruguay"}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Link de Google Maps (botón "Ver en Google Maps")</Label>
                <Input
                  value={mapsLink}
                  onChange={(e) => setMapsLink(e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                />
                <p className="text-xs text-muted-foreground">
                  Abrí Google Maps, buscá tu local, tocá "Compartir" y pegá el enlace acá.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Horarios de atención</CardTitle>
              <Button variant="outline" size="sm" onClick={addHour}>
                <Plus className="size-4 mr-1" /> Agregar fila
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {hours.length === 0 && (
                <p className="text-muted-foreground text-sm">Sin filas. Agregá una.</p>
              )}
              {hours.map((h, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Día(s)</Label>
                    <Input
                      value={h.label}
                      onChange={(e) => updateHour(i, "label", e.target.value)}
                      placeholder="Lunes a Viernes"
                    />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Horario</Label>
                    <Input
                      value={h.value}
                      onChange={(e) => updateHour(i, "value", e.target.value)}
                      placeholder="9:00 – 17:00  (o «Cerrado»)"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeHour(i)}
                    title="Quitar fila"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Tip: si escribís «Cerrado» en el horario, se muestra en gris.
              </p>
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={upsert.isPending}>
            {upsert.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </>
      )}
    </div>
  );
};
