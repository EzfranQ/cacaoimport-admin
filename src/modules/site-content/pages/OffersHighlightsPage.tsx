/**
 * Página: gestionar las Ofertas Destacadas de la tienda.
 * Panel izquierdo: buscador + lista de productos para agregar.
 * Panel derecho: productos en oferta actualmente, con reorden y quitar.
 */
import { ArrowUp, ArrowDown, X, Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ProductSearchInput } from "@/modules/orders/components/ProductSearchInput";
import {
  useOffersHighlights,
  useAddOfferHighlight,
  useRemoveOfferHighlight,
  useReorderOfferHighlights,
} from "../hooks/useOffersHighlights";

export const OffersHighlightsPage = () => {
  const { data: offers, isLoading } = useOffersHighlights();
  const add = useAddOfferHighlight();
  const remove = useRemoveOfferHighlight();
  const reorder = useReorderOfferHighlights();

  const items = offers ?? [];

  const handleAdd = async (product: { id: string; name: string }) => {
    if (items.some((f) => f.id === product.id)) {
      toast.info("Ese producto ya está en ofertas destacadas.");
      return;
    }
    try {
      await add.mutateAsync({ productId: product.id, nextPosition: items.length });
      toast.success(`"${product.name}" agregado a ofertas destacadas`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemove = async (productId: string, name: string) => {
    try {
      await remove.mutateAsync(productId);
      toast.success(`"${name}" quitado de ofertas`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const ids = items.map((i) => i.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await reorder.mutateAsync(ids);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="size-6 text-orange-500" />
            Ofertas Destacadas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Los productos que aparecen en la sección <strong>"Ofertas Destacadas"</strong> de la tienda (<code>/products</code>).
            También son los que aparecen al presionar el botón <strong>"Ver ofertas"</strong> del banner principal.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Panel izquierdo: agregar productos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="size-4" />
              Agregar producto a ofertas
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Buscá por nombre o SKU y hacé clic en <strong>Agregar</strong>.
            </p>
          </CardHeader>
          <CardContent>
            <ProductSearchInput
              onSelect={handleAdd}
              placeholder="Buscar producto por nombre o SKU…"
            />
            <p className="text-xs text-muted-foreground mt-3">
              Los productos que ya están en la lista aparecen marcados como "Ya en oferta".
            </p>
          </CardContent>
        </Card>

        {/* Panel derecho: lista actual de ofertas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              En oferta ahora{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({items.length} producto{items.length !== 1 ? "s" : ""})
              </span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Usá las flechas para cambiar el orden. El orden acá es el orden en la tienda.
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted rounded w-2/3" />
                      <div className="h-2.5 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 space-y-2">
                <Tag className="size-10 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">
                  No hay productos en oferta todavía.
                </p>
                <p className="text-muted-foreground text-xs">
                  Buscá un producto en el panel de la izquierda y hacé clic en <strong>Agregar</strong>.
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((p, index) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="text-xs text-muted-foreground w-5 text-center shrink-0 font-mono">
                      {index + 1}
                    </span>
                    <img
                      src={p.imageUrl || "/placeholder.png"}
                      alt={p.name}
                      className="w-11 h-11 rounded-lg object-contain bg-muted/30 shrink-0 border"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${p.price.toFixed(2)}{p.sku ? ` · SKU: ${p.sku}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={index === 0 || reorder.isPending}
                        onClick={() => move(index, -1)}
                        title="Subir en la lista"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        disabled={index === items.length - 1 || reorder.isPending}
                        onClick={() => move(index, 1)}
                        title="Bajar en la lista"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemove(p.id, p.name)}
                        title="Quitar de ofertas"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Nota informativa */}
      <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
        <strong>¿Dónde se ven estas ofertas?</strong>
        <ul className="mt-1 ml-4 list-disc space-y-0.5 text-orange-700">
          <li>En la tienda (<code>/products</code>), en la sección <strong>"Ofertas Destacadas"</strong> arriba del catálogo general.</li>
          <li>El botón <strong>"Ver Ofertas"</strong> del banner del Home hace scroll directo a esa sección.</li>
        </ul>
      </div>

    </div>
  );
};
