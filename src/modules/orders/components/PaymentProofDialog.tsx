import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";

type Props = {
  proofUrl: string | null;
  open?: boolean;
  onClose: () => void;
};

export default function PaymentProofDialog({ proofUrl, open = !!proofUrl, onClose }: Props) {
  const [imgError, setImgError] = useState(false);
  const isImage = typeof proofUrl === "string" && /\.(png|jpg|jpeg|webp|gif)$/i.test(proofUrl);

  const isOpen = !!proofUrl && open;

  return (
    <Dialog open={isOpen}>
      <DialogContent onInteractOutside={onClose} onEscapeKeyDown={onClose} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Comprobante de pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!proofUrl ? (
            <div className="text-sm text-muted-foreground">Sin comprobante adjunto</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline">Abrir en nueva pestaña</a>
                <span className="text-xs text-muted-foreground">Origen: {proofUrl}</span>
              </div>
              <div className="border rounded p-2 max-h-[70vh] overflow-auto">
                {isImage && !imgError ? (
                  <img
                    src={proofUrl}
                    alt="Comprobante de pago"
                    className="max-h-[65vh] mx-auto object-contain"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {imgError ? "No se pudo cargar la imagen. Usa el enlace para abrir el comprobante." : "Vista previa no disponible. Usa el enlace para abrir el comprobante."}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}