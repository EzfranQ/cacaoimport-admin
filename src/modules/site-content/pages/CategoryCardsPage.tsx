/**
 * Página: editar las tarjetas de categorías del Home (el diseño con fondo azul).
 * Permite cambiar imagen, nombre visible, link destino, orden y visibilidad.
 */
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { SiteImageUpload } from "../components/SiteImageUpload";
import {
  useCategoryCards,
  useSaveCategoryCard,
  useDeleteCategoryCard,
  type CategoryCard,
} from "../hooks/useCategoryCards";
import { useCategories } from "@/modules/categories/hooks/useCategories";

type Draft = Partial<CategoryCard> & { _draftId?: string };

function CategoryCardEditor({
  card,
  categoryOptions,
  onSavedDraft,
  onRemoveDraft,
}: {
  card: Draft;
  categoryOptions: { slug: string; label: string }[];
  onSavedDraft?: () => void;
  onRemoveDraft?: () => void;
}) {
  const save = useSaveCategoryCard();
  const del = useDeleteCategoryCard();

  const [name, setName] = useState(card.name ?? "");
  const [imageUrl, setImageUrl] = useState(card.image_url ?? "");
  const [altText, setAltText] = useState(card.alt_text ?? "");
  const [href, setHref] = useState(card.href ?? "");
  const [sortOrder, setSortOrder] = useState<number>(card.sort_order ?? 0);
  const [isActive, setIsActive] = useState<boolean>(card.is_active ?? true);

  useEffect(() => {
    setName(card.name ?? "");
    setImageUrl(card.image_url ?? "");
    setAltText(card.alt_text ?? "");
    setHref(card.href ?? "");
    setSortOrder(card.sort_order ?? 0);
    setIsActive(card.is_active ?? true);
  }, [card]);

  const isDraft = !card.id;

  const handleSave = async () => {
    if (!name) return toast.error("Poné un nombre a la categoría.");
    if (!imageUrl) return toast.error("Subí una imagen para la categoría.");
    try {
      await save.mutateAsync({
        id: card.id,
        name,
        image_url: imageUrl,
        alt_text: altText || null,
        href: href || null,
        sort_order: Number(sortOrder) || 0,
        is_active: isActive,
      });
      toast.success(isDraft ? "Categoría creada" : "Categoría actualizada");
      if (isDraft) onSavedDraft?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async () => {
    if (isDraft) return onRemoveDraft?.();
    if (!confirm("¿Eliminar esta tarjeta de categoría?")) return;
    try {
      await del.mutateAsync(card.id!);
      toast.success("Categoría eliminada");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card>
      <CardContent className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 pt-6">
        <SiteImageUpload value={imageUrl} onChange={setImageUrl} folder="categories" aspect="square" />

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nombre visible</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bazar y Decoración" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoría destino (link)</Label>
              <Select
                value={
                  categoryOptions.find((o) => href === `/products?category=${o.slug}`)?.slug ?? "custom"
                }
                onValueChange={(slug) => {
                  if (slug !== "custom") setHref(`/products?category=${slug}`);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Elegir categoría" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((o) => (
                    <SelectItem key={o.slug} value={o.slug}>
                      {o.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Link personalizado…</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Link (URL)</Label>
            <Input value={href} onChange={(e) => setHref(e.target.value)} placeholder="/products?category=..." />
          </div>

          <div className="space-y-1.5">
            <Label>Texto alternativo (alt — para SEO)</Label>
            <Input value={altText} onChange={(e) => setAltText(e.target.value)} placeholder="Descripción de la imagen" />
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

export const CategoryCardsPage = () => {
  const { data, isLoading } = useCategoryCards();
  const { data: categoriesResult } = useCategories({
    page: 1,
    pageSize: 1000,
    sortBy: "name",
    sortOrder: "asc",
  });
  const categoryOptions = (categoriesResult?.data ?? []).map((c) => ({
    slug: c.slug,
    label: c.name,
  }));

  const [drafts, setDrafts] = useState<Draft[]>([]);

  const addDraft = () => {
    const nextOrder = (data?.length ?? 0) + drafts.length;
    setDrafts((d) => [
      ...d,
      { _draftId: crypto.randomUUID(), sort_order: nextOrder, is_active: true },
    ]);
  };
  const removeDraft = (id: string) => setDrafts((d) => d.filter((x) => x._draftId !== id));

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Categorías del Home</h1>
          <p className="text-muted-foreground text-sm">
            Tarjetas de categorías con el diseño azul de la página principal.
          </p>
        </div>
        <Button onClick={addDraft}>
          <Plus className="size-4 mr-1" /> Agregar categoría
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-4">
          {(data ?? []).map((card) => (
            <CategoryCardEditor key={card.id} card={card} categoryOptions={categoryOptions} />
          ))}
          {drafts.map((d) => (
            <CategoryCardEditor
              key={d._draftId}
              card={d}
              categoryOptions={categoryOptions}
              onSavedDraft={() => removeDraft(d._draftId!)}
              onRemoveDraft={() => removeDraft(d._draftId!)}
            />
          ))}
          {(data?.length ?? 0) === 0 && drafts.length === 0 && (
            <p className="text-muted-foreground">No hay categorías. Agregá la primera.</p>
          )}
        </div>
      )}
    </div>
  );
};
