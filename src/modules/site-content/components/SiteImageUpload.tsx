/**
 * Selector de imagen reutilizable: sube al bucket `site-assets` apenas se elige
 * el archivo y devuelve la URL pública vía onChange.
 */
import { useRef, useState } from "react";
import { Loader2, ImageIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { uploadSiteAsset } from "../lib/uploadSiteAsset";

interface SiteImageUploadProps {
  value?: string | null;
  onChange: (url: string) => void;
  /** Carpeta dentro del bucket donde se guarda (logo, banners, hero, categories) */
  folder: string;
  label?: string;
  /** Relación de aspecto del preview (default video 16/9) */
  aspect?: "video" | "square" | "wide";
  onClear?: () => void;
}

const aspectClass: Record<string, string> = {
  video: "aspect-video",
  square: "aspect-square",
  wide: "aspect-[3/1]",
};

export function SiteImageUpload({
  value,
  onChange,
  folder,
  label,
  aspect = "video",
  onClear,
}: SiteImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadSiteAsset(file, folder);
      onChange(url);
      toast.success("Imagen subida correctamente");
    } catch (e: any) {
      toast.error(e.message ?? "Error subiendo la imagen");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      {label && <p className="text-sm font-medium mb-2">{label}</p>}
      <div
        className={`relative w-full ${aspectClass[aspect]} border rounded-lg bg-muted/30 flex items-center justify-center overflow-hidden`}
      >
        {value ? (
          <img src={value} alt={label ?? ""} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImageIcon className="size-8" />
            <span className="text-xs">Sin imagen</span>
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="flex gap-2 mt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          {value ? "Cambiar imagen" : "Subir imagen"}
        </Button>
        {value && onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={onClear}
            title="Quitar imagen"
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
