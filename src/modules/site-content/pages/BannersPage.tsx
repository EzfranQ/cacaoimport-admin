/**
 * Página: editar los banners del Home.
 * Slots fijos: "new_products" (banner junto a Nuevos Ingresos) y "home_bottom"
 * (banner ancho al final). Cada uno tiene versión escritorio y móvil.
 */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { SiteImageUpload } from "../components/SiteImageUpload";
import { useSiteBanners, useSaveBanner, type SiteBanner } from "../hooks/useSiteBanners";

const SLOTS: { slot: string; title: string; description: string }[] = [
  {
    slot: "new_products",
    title: 'Banner "Nuevos Ingresos"',
    description: "Imagen vertical que aparece al costado de la grilla de Nuevos Ingresos.",
  },
  {
    slot: "home_bottom",
    title: "Banner inferior (ancho)",
    description: 'Imagen ancha tipo "Conocé nuestros nuevos ingresos" al final del Home.',
  },
];

function BannerEditor({ banner }: { banner: { slot: string; title: string; description: string } }) {
  const { data } = useSiteBanners();
  const save = useSaveBanner();
  const current: SiteBanner | undefined = data?.find((b) => b.slot === banner.slot);

  const [desktop, setDesktop] = useState("");
  const [mobile, setMobile] = useState("");
  const [alt, setAlt] = useState("");

  useEffect(() => {
    if (current) {
      setDesktop(current.desktop_url ?? "");
      setMobile(current.mobile_url ?? "");
      setAlt(current.alt ?? "");
    }
  }, [current]);

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        slot: banner.slot,
        desktop_url: desktop || null,
        mobile_url: mobile || null,
        alt: alt || null,
      });
      toast.success("Banner guardado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{banner.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{banner.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SiteImageUpload
            value={desktop}
            onChange={setDesktop}
            onClear={() => setDesktop("")}
            folder="banners"
            label="Versión escritorio"
            aspect="wide"
          />
          <SiteImageUpload
            value={mobile}
            onChange={setMobile}
            onClear={() => setMobile("")}
            folder="banners"
            label="Versión móvil"
            aspect="video"
          />
        </div>
        <div className="space-y-2">
          <Label>Texto alternativo (alt)</Label>
          <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Descripción del banner" />
        </div>
        <Button onClick={handleSave} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : "Guardar banner"}
        </Button>
      </CardContent>
    </Card>
  );
}

export const BannersPage = () => {
  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Banners del Home</h1>
        <p className="text-muted-foreground text-sm">
          Cambiá las imágenes tipo banner de la página principal.
        </p>
      </div>
      {SLOTS.map((s) => (
        <BannerEditor key={s.slot} banner={s} />
      ))}
    </div>
  );
};
