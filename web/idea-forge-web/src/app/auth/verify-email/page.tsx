"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { verifyEmail, resendCode } from "@/lib/api";
import { Loader2, CheckCircle2, Mail } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);

  const userId = searchParams.get("user_id") || "";
  const email = searchParams.get("email") || "";
  const maskedEmail = email ? email.replace(/(.{2})(.*)(@.*)/, "$1***$3") : "";

  useEffect(() => {
    if (!userId) {
      toast.error("ID de usuario no encontrado");
      router.push("/auth/register");
    }
  }, [userId, router]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("El código debe tener 6 dígitos");
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail({ user_id: userId, code });
      toast.success("¡Email verificado exitosamente!");

      setTimeout(() => {
        router.push("/auth/login");
      }, 1500);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || "Código inválido";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setIsResending(true);
    try {
      await resendCode({ user_id: userId });
      toast.success("Código reenviado. Revisa tu email.");
      setCanResend(false);
      setResendCooldown(60); // 60 segundos de cooldown
    } catch (error: any) {
      toast.error("Error al reenviar el código");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <Mail className="h-16 w-16 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold">Verifica tu Email</CardTitle>
          <CardDescription>
            Hemos enviado un código de 6 dígitos a{" "}
            <span className="font-medium">{maskedEmail || "tu email"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="code">Código de Verificación</Label>
            <Input
              id="code"
              placeholder="123456"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              disabled={isLoading}
              className="text-center text-2xl tracking-widest"
            />
            <p className="text-xs text-muted-foreground text-center">
              El código expira en 15 minutos
            </p>
          </div>

          <Button
            onClick={handleVerify}
            className="w-full"
            disabled={isLoading || code.length !== 6}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Verificar Email
              </>
            )}
          </Button>

          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">¿No recibiste el código?</p>
            <Button
              variant="outline"
              onClick={handleResend}
              disabled={!canResend || isResending}
              className="w-full"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reenviando...
                </>
              ) : canResend ? (
                "Reenviar Código"
              ) : (
                `Reenviar en ${resendCooldown}s`
              )}
            </Button>
          </div>

          <div className="text-sm text-center text-muted-foreground pt-4 border-t">
            <Link href="/auth/login" className="text-primary hover:underline">
              Volver al inicio de sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
