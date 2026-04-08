import { cn } from "@/app/libs/shadcn";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { useAuth } from "@/shared/contexts";
import { Navigate, Outlet } from "react-router";

export function AuthTemplate({
  className,
  ...props
}: React.ComponentProps<"div">) {

  const isAuthenticated = useAuth().isAuthenticated;
  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-blue-200">
      <div className="w-full max-w-sm">
        <div className={cn("flex flex-col gap-6", className)} {...props}>
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Bienvenido</CardTitle>
            </CardHeader>
            <CardContent>
              <Outlet />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
