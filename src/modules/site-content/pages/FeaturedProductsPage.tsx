/**
 * Página: seleccionar y ordenar los Productos Destacados del Home.
 * Buscador para agregar productos + lista ordenable (mover arriba/abajo) + quitar.
 */
import { ArrowUp, ArrowDown, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ProductSearchInput } from "@/modules/orders/components/ProductSearchInput";
import { RandomModeToggle } from "../components/RandomModeToggle";
import {
  useFeaturedProducts,
  useAddFeatured,
  useRemoveFeatured,
  useReorderFeatured,
} from "../hooks/useFeaturedProducts";

export const FeaturedProductsPage = () => {
  const { data: featured, isLoading } = useFeaturedProducts();
  const add = useAddFeatured();
  const remove = useRemoveFeatured();
  const reorder = useReorderFeatured();

  const items = featured ?? [];

  const handleAdd = async (product: { id: string; name: string }) => {
    if (items.some((f) => f.id === product.id)) {
      toast.info("Ese producto ya está en destacados.");
      return;
    }
    try {
      await add.mutateAsync({ productId: product.id, nextOrder: items.length });
      toast.success(`"${product.name}" agregado a destacados`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await remove.mutateAsync(id);
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
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Productos Destacados</h1>
        <p className="text-muted-foreground text-sm">
          Elegí qué productos se muestran en el carrusel "Productos Destacados" del Home y en qué orden.
        </p>
      </div>

      <RandomModeToggle settingKey="featured_random" />

      <Card>
        <CardHeader>
          <CardTitle>Agregar producto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductSearchInput onSelect={handleAdd} placeholder="Buscar producto por nombre o SKU…" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Destacados actuales ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">
              Todavía no hay destacados. Buscá y agregá productos arriba.
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((p, index) => (
                <li key={p.id} className="flex items-center gap-3 py-2">
                  <span className="text-sm text-muted-foreground w-5 text-center">{index + 1}</span>
                  <img
                    src={p.imageUrl || "/placeholder.png"}
                    alt={p.name}
                    className="w-12 h-12 rounded object-contain bg-muted/30 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ${p.price.toFixed(2)} {p.sku ? `· SKU: ${p.sku}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => move(index, -1)}
                      title="Subir"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={index === items.length - 1 || reorder.isPending}
                      onClick={() => move(index, 1)}
                      title="Bajar"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleRemove(p.id)}
                      title="Quitar de destacados"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
