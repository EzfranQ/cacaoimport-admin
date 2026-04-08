import { useAuth } from "@/shared/contexts/contextAuth";
import { Button } from "@/shared/components/ui/button";

export const UnauthorizedPage = () => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-destructive">Acceso No Autorizado</h1>
        <p className="text-lg text-muted-foreground">
          Lo sentimos, no tienes los permisos necesarios para acceder a esta sección.
        </p>
        <p className="text-sm text-muted-foreground">
          Esta área está reservada para administradores.
        </p>
        <Button onClick={handleSignOut} variant="outline">
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};