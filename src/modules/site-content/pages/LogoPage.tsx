/**
 * Página: editar el logo del sitio.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SiteImageUpload } from "../components/SiteImageUpload";
import { useSiteSetting, useUpsertSiteSetting, type LogoSetting } from "../hooks/useSiteSettings";

export const LogoPage = () => {
  const { data, isLoading } = useSiteSetting<LogoSetting>("logo");
  const upsert = useUpsertSiteSetting();

  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  useEffect(() => {
    if (data) {
      setUrl(data.url ?? "");
      setAlt(data.alt ?? "");
    }
  }, [data]);

  const handleSave = async () => {
    if (!url) {
      toast.error("Subí un logo primero.");
      return;
    }
    try {
      await upsert.mutateAsync({ key: "logo", value: { url, alt } });
      toast.success("Logo actualizado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Logo del sitio</h1>
        <p className="text-muted-foreground text-sm">
          Subí y guardá el logo que aparece en la cabecera de la web.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : (
            <>
              <div className="bg-white border rounded-lg p-6 flex items-center justify-center">
                <SiteImageUpload
                  value={url}
                  onChange={setUrl}
                  folder="logo"
                  aspect="wide"
                />
              </div>
              <div className="space-y-2">
                <Label>Texto alternativo (alt)</Label>
                <Input
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="Cacao Import"
                />
              </div>
              <Button onClick={handleSave} disabled={upsert.isPending}>
                {upsert.isPending ? "Guardando…" : "Guardar logo"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
