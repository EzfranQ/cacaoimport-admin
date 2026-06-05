/**
 * Interruptor "Modo aleatorio" reutilizable para Destacados y Nuevos Ingresos.
 */
import { toast } from "sonner";
import { Shuffle } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Switch } from "@/shared/components/ui/switch";
import { Label } from "@/shared/components/ui/label";
import { useRandomMode, useSetRandomMode, type RandomModeKey } from "../hooks/useRandomMode";

export function RandomModeToggle({ settingKey }: { settingKey: RandomModeKey }) {
  const { data: random } = useRandomMode(settingKey);
  const setMode = useSetRandomMode(settingKey);
  const isOn = random === true;

  const handleToggle = async (value: boolean) => {
    try {
      await setMode.mutateAsync(value);
      toast.success(value ? "Modo aleatorio activado" : "Modo manual activado");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 py-4">
        <div className="flex items-start gap-3">
          <Shuffle className="size-5 mt-0.5 text-muted-foreground" />
          <div>
            <Label className="text-base">Modo aleatorio</Label>
            <p className="text-sm text-muted-foreground">
              Si lo activás, se muestran productos al azar y se ignora la selección manual de abajo.
              Útil cuando no tenés tiempo de elegirlos a mano.
            </p>
          </div>
        </div>
        <Switch checked={isOn} onCheckedChange={handleToggle} disabled={setMode.isPending} />
      </CardContent>
    </Card>
  );
}
