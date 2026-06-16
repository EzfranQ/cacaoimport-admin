/**
 * Página: editar los 3 textos de confianza del banner principal.
 * Se guardan en site_settings (key="trust_items") como array de { label }.
 * El carousel los carga y muestra debajo de los botones.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useSiteSetting, useUpsertSiteSetting } from "../hooks/useSiteSettings";

const DEFAULTS = [
  "Envíos a todo Uruguay",
  "Garantía oficial",
  "Pago seguro",
];

export const TrustItemsPage = () => {
  const { data, isLoading } = useSiteSetting<Array<{ label: string }>>("trust_items");
  const upsert = useUpsertSiteSetting();
  const [labels, setLabels] = useState<string[]>(DEFAULTS);

  useEffect(() => {
    if (data && Array.isArray(data)) {
      setLabels(data.map((d) => d.label ?? ""));
    }
  }, [data]);

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        key: "trust_items",
        value: labels.map((label) => ({ label: label.trim() })),
      });
      toast.success("Textos del banner guardados");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Textos del Banner</h1>
        <p className="text-muted-foreground text-sm">
          Los 3 textos de confianza que aparecen debajo de los botones "Comprar ahora" y "Ver ofertas" en el banner principal del Home.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Editar textos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : (
            <>
              {labels.map((label, i) => (
                <div key={i} className="space-y-1.5">
                  <Label>Texto {i + 1}</Label>
                  <Input
                    value={label}
                    onChange={(e) => {
                      const next = [...labels];
                      next[i] = e.target.value;
                      setLabels(next);
                    }}
                    placeholder={DEFAULTS[i]}
                  />
                </div>
              ))}
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
