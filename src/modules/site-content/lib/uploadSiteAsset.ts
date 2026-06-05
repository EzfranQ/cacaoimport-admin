/**
 * Utilidades para subir/eliminar imágenes del sitio en el bucket `site-assets`.
 * Se usa para logo, banners, slides del carrusel y tarjetas de categorías.
 */
import { supabase } from "@/app/libs/supabase";

const BUCKET = "site-assets";
const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "image/gif",
]);
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/svg+xml":
      return "svg";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

/**
 * Sube un archivo al bucket `site-assets` dentro de la carpeta indicada
 * y devuelve la URL pública.
 */
export async function uploadSiteAsset(file: File, folder: string): Promise<string> {
  if (!ALLOWED.has(file.type)) {
    throw new Error("Formato no permitido. Usá JPG, PNG, WEBP o SVG.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("La imagen supera el máximo de 3 MB.");
  }

  const path = `${folder}/${crypto.randomUUID()}.${extFromMime(file.type)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw new Error(`Error subiendo la imagen: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Elimina (best-effort) un asset del bucket a partir de su URL pública.
 * Si la URL no pertenece al bucket (p. ej. una URL externa antigua), no hace nada.
 */
export async function deleteSiteAsset(publicUrl?: string | null): Promise<void> {
  if (!publicUrl) return;
  const marker = `/${BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return;
  const path = publicUrl.slice(idx + marker.length);
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}
