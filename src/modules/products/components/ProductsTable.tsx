/**
 * Tabla de Productos con acciones básicas
 * Usa TanStack Query para listar y permite navegar a crear/editar y eliminar/restaurar.
 */
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { Table } from "@/shared/components/ui/table";
import { useProducts, useDeleteProduct, useRestoreProduct, useUpdateProduct } from "../hooks/useProducts";
import { usePrimaryProductImage, useDeleteProductImage, useUploadProductImages } from "../hooks/useProductImages";
import { toast } from "sonner";

export default function ProductsTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [page, setPage] = useState(1);
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const { data, isLoading } = useProducts({ page, pageSize: 10, search, supplierSearch, includeDeleted, sortBy: "created_at", sortOrder: "desc" });
  const deleteMutation = useDeleteProduct();
  const restoreMutation = useRestoreProduct();

  const items = data?.data ?? [];

  const onCreate = () => navigate("/admin/products/create");
  const onEdit = (id: string) => navigate(`/admin/products/edit/${id}`);

  /**
   * Elimina un producto (soft delete) con confirmación del usuario.
   * Previene borrados accidentales mostrando un diálogo de confirmación.
   */
  const onDelete = async (id: string) => {
    const confirmed = window.confirm(
      "¿Estás seguro de eliminar este producto? Puedes verlo en 'Mostrar eliminados' y restaurarlo luego."
    );
    if (!confirmed) return;
    await deleteMutation.mutateAsync(id);
  };

  const onRestore = async (id: string) => {
    await restoreMutation.mutateAsync(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          className="border rounded px-2 py-1"
          placeholder="Buscar por nombre o descripción"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1"
          placeholder="Buscar por proveedor"
          value={supplierSearch}
          onChange={(e) => setSupplierSearch(e.target.value)}
        />
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} />
          Mostrar eliminados
        </label>
        <Button onClick={onCreate}>Nuevo Producto</Button>
      </div>

      <div className="border rounded">
        <Table>
          <thead>
            <tr>
              <th className="text-left p-2">Portada</th>
              <th className="text-left p-2">Nombre</th>
              <th className="text-left p-2">SKU</th>
              <th className="text-left p-2">Proveedor</th>
              <th className="text-left p-2">Cant. p/caja</th>
              <th className="text-left p-2">Precio</th>
              <th className="text-left p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="p-4">Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} className="p-4">Sin resultados</td></tr>
            ) : (
              items.map((p) => (
                <tr key={p.id} className={p.deleted_at ? "opacity-60" : ""}>
                  <td className="p-2"><PrimaryImageCell productId={p.id} /></td>
                  <td className="p-2">{p.name}</td>
                  <td className="p-2">{p.sku || "-"}</td>
                  <td className="p-2">{p.supplier_name || "-"}</td>
                  <td className="p-2 text-center"><QtyBoxCell productId={p.id} value={p.qty_box ?? null} /></td>
                  <td className="p-2">{Number(p.price).toFixed(2)}</td>
                  <td className="p-2 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(p.id)}>Editar</Button>
                    {p.deleted_at ? (
                      <Button variant="secondary" size="sm" onClick={() => onRestore(p.id)}>Restaurar</Button>
                    ) : (
                      <Button variant="destructive" size="sm" onClick={() => onDelete(p.id)}>Eliminar</Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
        <span>Página {data?.currentPage ?? 1} de {data?.totalPages ?? 1}</span>
        <Button variant="outline" disabled={!data?.hasNextPage} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
      </div>
    </div>
  );
}

/**
 * Celda inline editable para qty_box
 */
function QtyBoxCell({ productId, value }: { productId: string; value: number | null }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const updateMutation = useUpdateProduct();

  const startEdit = () => {
    setDraft(value != null ? String(value) : "");
    setEditing(true);
  };

  const save = async () => {
    setEditing(false);
    const newVal = draft.trim() === "" ? null : Number(draft);
    if (newVal === value) return;
    try {
      await updateMutation.mutateAsync({ id: productId, updates: { qty_box: newVal ?? undefined } });
      toast.success("Cantidad actualizada");
    } catch (err: any) {
      toast.error(err.message || "Error al guardar");
    }
  };

  if (editing) {
    return (
      <input
        type="number"
        min="0"
        autoFocus
        className="w-16 border rounded px-1 py-0.5 text-center text-sm"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <button
      type="button"
      title="Click para editar cantidad por caja"
      className="min-w-[2rem] px-1 py-0.5 rounded hover:bg-slate-100 transition-colors text-sm font-medium text-slate-700 cursor-pointer"
      onClick={startEdit}
    >
      {value != null ? value : <span className="text-muted-foreground">-</span>}
    </button>
  );
}

/**
 * Celda de imagen principal del producto
 * Muestra miniatura si existe y permite subir/cambiar portada o quitarla.
 */
function PrimaryImageCell({ productId }: { productId: string }) {
  const { data: primary } = usePrimaryProductImage(productId);
  const uploadMutation = useUploadProductImages();
  const deleteMutation = useDeleteProductImage();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    const MAX = 1572864; // 1.5 MB
    if (!allowed.has(file.type)) {
      toast.warning("Formato no permitido. Solo JPG/PNG/WEBP.");
      return;
    }
    if (file.size > MAX) {
      toast.warning("Archivo supera 1.5 MB.");
      return;
    }
    try {
      await uploadMutation.mutateAsync({ productId, items: [{ file, alt: null, isPrimary: true }] });
      toast.success("Portada actualizada");
    } catch (err: any) {
      toast.error(err.message || "Error subiendo portada");
    } finally {
      e.target.value = ""; // reset input
    }
  };

  const onRemove = async () => {
    if (!primary) return;
    try {
      await deleteMutation.mutateAsync({ productImageId: primary.productImageId, productId });
      toast.success("Portada eliminada");
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar portada");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="w-14 h-14 border rounded overflow-hidden bg-muted">
        {primary?.publicUrl ? (
          <img src={primary.publicUrl} alt={primary.alt || "portada"} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Sin portada</div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <label className="cursor-pointer">
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onFileChange} />
          <Button variant="outline" type="button">{primary ? "Cambiar" : "Subir"}</Button>
        </label>
        {primary && (
          <Button variant="destructive" type="button" onClick={onRemove}>Quitar</Button>
        )}
      </div>
    </div>
  );
}
