import { useForm } from "react-hook-form";
import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/ui/form";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { formLoginSchema } from "../schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/shared/contexts";
import type { z } from "zod";

export const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof formLoginSchema>>({
    resolver: zodResolver(formLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formLoginSchema>) => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        setError(error.message);
      } else {
        // Redirigir al dashboard después del login exitoso
        navigate("/admin");
      }
    } catch (err) {
      setError("Error inesperado. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
            {error}
          </div>
        )}

        <FormField
          name="email"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <Input {...field} placeholder="Ingresa tu email" disabled={isLoading} />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="password"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contraseña</FormLabel>
              <Input 
                {...field} 
                type="password" 
                placeholder="Ingresa tu contraseña" 
                disabled={isLoading}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
        </Button>
      
      </form>
    </Form>
  );
};
