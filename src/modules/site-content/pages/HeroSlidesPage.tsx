/**
 * Página: editar el carrusel principal del Home (hero).
 * Permite agregar, editar, ordenar, activar/desactivar y borrar slides.
 */
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { SiteImageUpload } from "../components/SiteImageUpload";
import {
  useHeroSlides,
  useSaveHeroSlide,
  useDeleteHeroSlide,
  type HeroSlide,
} from "../hooks/useHeroSlides";

type Draft = Partial<HeroSlide> & { _draftId?: string };

function SlideCard({
  slide,
  onSavedDraft,
  onRemoveDraft,
}: {
  slide: Draft;
  onSavedDraft?: () => void;
  onRemoveDraft?: () => void;
}) {
  const save = useSaveHeroSlide();
  const del = useDeleteHeroSlide();

  const [imageUrl, setImageUrl] = useState(slide.image_url ?? "");
  const [title, setTitle] = useState(slide.title ?? "");
  const [subtitle, setSubtitle] = useState(slide.subtitle ?? "");
  const [description, setDescription] = useState(slide.description ?? "");
  const [alt, setAlt] = useState(slide.alt ?? "");
  const [href, setHref] = useState(slide.href ?? "/products");
  const [badge, setBadge] = useState(slide.badge ?? "");
  const [sortOrder, setSortOrder] = useState<number>(slide.sort_order ?? 0);
  const [isActive, setIsActive] = useState<boolean>(slide.is_active ?? true);

  useEffect(() => {
    setImageUrl(slide.image_url ?? "");
    setTitle(slide.title ?? "");
    setSubtitle(slide.subtitle ?? "");
    setDescription(slide.description ?? "");
    setAlt(slide.alt ?? "");
    setHref(slide.href ?? "/products");
    setBadge(slide.badge ?? "");
    setSortOrder(slide.sort_order ?? 0);
    setIsActive(slide.is_active ?? true);
  }, [slide]);

  const isDraft = !slide.id;

  const handleSave = async () => {
    if (!imageUrl) {
      toast.error("Subí una imagen para el slide.");
      return;
    }
    try {
      await save.mutateAsync({
        id: slide.id,
        image_url: imageUrl,
        title: title || null,
        subtitle: subtitle || null,
        description: description || null,
        alt: alt || null,
        href: href || "/products",
        badge: badge || null,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      });
      toast.success(isDraft ? "Slide creado" : "Slide actualizado");
      if (isDraft) onSavedDraft?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (isDraft) {
      onRemoveDraft?.();
      return;
    }
    if (!confirm("¿Eliminar este slide del carrusel?")) return;
    try {
      await del.mutateAsync(slide.id!);
      toast.success("Slide eliminado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card>
      <CardContent className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 pt-6">
        <SiteImageUpload value={imageUrl} onChange={setImageUrl} folder="hero" aspect="video" />

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: TECNOLOGÍA" />
            </div>
            <div className="space-y-1.5">
              <Label>Subtítulo (naranja)</Label>
              <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ej: SIN LÍMITES" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Los mejores productos al mejor precio." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Enlace del botón (href)</Label>
              <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder="/products" />
            </div>
            <div className="space-y-1.5">
              <Label>Badge (opcional)</Label>
              <Input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Ej: NUEVO, -20%" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Texto alternativo (alt — para SEO)</Label>
            <Input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="Descripción de la imagen" />
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="space-y-1.5">
              <Label>Orden</Label>
              <Input
                type="number"
                className="w-24"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Activo</Label>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button onClick={handleSave} disabled={save.isPending}>
              {save.isPending ? "Guardando…" : "Guardar"}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={del.isPending}>
              <Trash2 className="size-4 mr-1" />
              {isDraft ? "Cancelar" : "Eliminar"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const HeroSlidesPage = () => {
  const { data, isLoading } = useHeroSlides();
  const [drafts, setDrafts] = useState<Draft[]>([]);

  const addDraft = () => {
    const nextOrder = (data?.length ?? 0) + drafts.length;
    setDrafts((d) => [
      ...d,
      { _draftId: crypto.randomUUID(), sort_order: nextOrder, is_active: true },
    ]);
  };

  const removeDraft = (draftId: string) =>
    setDrafts((d) => d.filter((x) => x._draftId !== draftId));

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Carrusel principal</h1>
          <p className="text-muted-foreground text-sm">
            Imágenes grandes que rotan en la parte superior del Home.
          </p>
        </div>
        <Button onClick={addDraft}>
          <Plus className="size-4 mr-1" /> Agregar slide
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-4">
          {(data ?? []).map((slide) => (
            <SlideCard key={slide.id} slide={slide} />
          ))}
          {drafts.map((d) => (
            <SlideCard
              key={d._draftId}
              slide={d}
              onSavedDraft={() => removeDraft(d._draftId!)}
              onRemoveDraft={() => removeDraft(d._draftId!)}
            />
          ))}
          {(data?.length ?? 0) === 0 && drafts.length === 0 && (
            <p className="text-muted-foreground">No hay slides. Agregá el primero.</p>
          )}
        </div>
      )}
    </div>
  );
};
