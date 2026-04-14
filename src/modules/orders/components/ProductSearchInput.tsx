import { useState, useRef, useEffect } from "react";
import { Input } from "@/shared/components/ui/input";
import { supabase } from "@/app/libs/supabase";
import { Search, Loader2 } from "lucide-react";
import type { Product } from "@/modules/products/hooks/useProducts";

interface ProductSearchInputProps {
  onSelect: (product: Product) => void;
  placeholder?: string;
}

export const ProductSearchInput = ({
  onSelect,
  placeholder = "Buscar por nombre o código (SKU)…",
}: ProductSearchInputProps) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("id,name,sku,price,description")
          .is("deleted_at", null)
          .or(`name.ilike.%${value}%,sku.ilike.%${value}%`)
          .order("name", { ascending: true })
          .limit(8);

        if (!error && data) {
          setResults(data as Product[]);
          setOpen(true);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (product: Product) => {
    onSelect(product);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        {loading && (
          <Loader2 size={15} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
        )}
        <Input
          className="pl-8 pr-8"
          value={query}
          placeholder={placeholder}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
          {results.map((product) => (
            <button
              key={product.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur before click
                handleSelect(product);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm text-slate-800 truncate">{product.name}</span>
                <span className="text-sm font-semibold text-slate-700 shrink-0">
                  ${Number(product.price).toFixed(2)}
                </span>
              </div>
              {product.sku && (
                <span className="text-xs text-muted-foreground">SKU: {product.sku}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {open && !loading && results.length === 0 && query.trim() && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg px-3 py-2 text-sm text-muted-foreground">
          Sin resultados para "{query}"
        </div>
      )}
    </div>
  );
};
