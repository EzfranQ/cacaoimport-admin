/**
 * Página: seleccionar y ordenar los productos de "Nuevos Ingresos" del Home.
 * Buscador para agregar + lista ordenable + quitar. Máximo 6 (no romper el diseño).
 */
import { ArrowUp, ArrowDown, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ProductSearchInput } from "@/modules/orders/components/ProductSearchInput";
import { RandomModeToggle } from "../components/RandomModeToggle";
import {
  useNewArrivals,
  useAddNewArrival,
  useRemoveNewArrival,
  useReorderNewArrivals,
  MAX_NEW_ARRIVALS,
} from "../hooks/useNewArrivals";

export const NewArrivalsPage = () => {
  const { data: arrivals, isLoading } = useNewArrivals();
  const add = useAddNewArrival();
  const remove = useRemoveNewArrival();
  const reorder = useReorderNewArrivals();

  const items = arrivals ?? [];
  const isFull = items.length >= MAX_NEW_ARRIVALS;

  const handleAdd = async (product: { id: string; name: string }) => {
    if (items.some((f) => f.id === product.id)) {
      toast.info("Ese producto ya está en Nuevos Ingresos.");
      return;
    }
    if (isFull) {
      toast.warning(`Máximo ${MAX_NEW_ARRIVALS} productos. Quitá uno antes de agregar otro.`);
      return;
    }
    try {
      await add.mutateAsync({ productId: product.id, nextOrder: items.length });
      toast.success(`"${product.name}" agregado a Nuevos Ingresos`);
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
        <h1 className="text-2xl font-bold">Nuevos Ingresos</h1>
        <p className="text-muted-foreground text-sm">
          Elegí qué productos se muestran en la sección "Nuevos Ingresos" del Home (máximo {MAX_NEW_ARRIVALS}).
          Si no seleccionás ninguno, se muestran productos al azar.
        </p>
      </div>

      <RandomModeToggle settingKey="new_arrivals_random" />

      <Card>
        <CardHeader>
          <CardTitle>Agregar producto</CardTitle>
        </CardHeader>
        <CardContent>
          {isFull ? (
            <p className="text-sm text-amber-600">
              Llegaste al máximo de {MAX_NEW_ARRIVALS}. Quitá un producto para poder agregar otro.
            </p>
          ) : (
            <ProductSearchInput onSelect={handleAdd} placeholder="Buscar producto por nombre o SKU…" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Seleccionados ({items.length}/{MAX_NEW_ARRIVALS})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">
              Sin selección. Se mostrarán productos al azar. Buscá y agregá productos arriba.
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
                      title="Quitar de Nuevos Ingresos"
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
