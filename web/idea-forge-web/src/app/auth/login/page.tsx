"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { login } from "@/lib/api";
import { setAuthToken, setUser } from "@/lib/auth";
import { Loader2, LogIn } from "lucide-react";

const loginSchema = z.object({
  email_or_username: z.string().min(3, "Mínimo 3 caracteres"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginForm = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [userIdForVerification, setUserIdForVerification] = useState("");

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await login(data);

      if (response.token) {
        setAuthToken(response.token);
        setUser(response.user);
        toast.success("¡Bienvenido de vuelta!");
        router.push(redirectUrl);
      }
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.user_id) {
        // Usuario no verificado
        setNeedsVerification(true);
        setUserIdForVerification(error.response.data.user_id);
        toast.error("Por favor verifica tu email antes de iniciar sesión");
      } else {
        toast.error(error.response?.data?.error || "Error al iniciar sesión");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToVerification = () => {
    router.push(`/auth/verify-email?user_id=${userIdForVerification}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder a Idea Forge
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email_or_username">Email o Nombre de Usuario</Label>
              <Input
                id="email_or_username"
                placeholder="tu@email.com o usuario"
                {...registerField("email_or_username")}
                disabled={isLoading}
              />
              {errors.email_or_username && (
                <p className="text-sm text-destructive">{errors.email_or_username.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...registerField("password")}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            {needsVerification && (
              <div className="p-3 border border-yellow-500 bg-yellow-500/10 rounded-md">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  Tu cuenta aún no está verificada.
                  <button
                    type="button"
                    onClick={handleGoToVerification}
                    className="ml-1 underline font-medium"
                  >
                    Ir a verificación
                  </button>
                </p>
              </div>
            )}

            <div className="text-sm text-right">
              <Link href="/auth/forgot-password" className="text-primary hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Iniciar Sesión
                </>
              )}
            </Button>

            <div className="text-sm text-center text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link href="/auth/register" className="text-primary hover:underline font-medium">
                Regístrate aquí
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <LoginContent />
    </Suspense>
  );
}
