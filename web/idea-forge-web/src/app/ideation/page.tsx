"use client";

import { useState } from "react";
import { createIdea } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Lightbulb, Loader2 } from "lucide-react";

export default function IdeationIndex() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [problem, setProblem] = useState("");
  const [scope, setScope] = useState("");
  const [validateCompetition, setValidateCompetition] = useState(true);
  const [validateMonetization, setValidateMonetization] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();

    if (!title || !objective || !problem || !scope) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setLoading(true);
    try {
      console.log("📝 Creando idea...");
      const idea = await createIdea({
        title,
        objective,
        problem,
        scope,
        validate_competition: validateCompetition,
        validate_monetization: validateMonetization,
      });
      console.log("✅ Idea creada:", idea);
      toast.success("Idea creada exitosamente");
      router.push(`/ideation/${idea.ID}`);
    } catch (error: any) {
      console.error("❌ Error completo:", error);

      // Mensaje más descriptivo según el tipo de error
      let errorMessage = "Error al crear la idea";

      if (error.code === "ERR_NETWORK") {
        errorMessage = "No se puede conectar al servidor. ¿Está corriendo el backend en http://localhost:8080?";
      } else if (error.response) {
        errorMessage = `Error del servidor: ${error.response.status} - ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = "No se recibió respuesta del servidor";
      }

      toast.error(errorMessage, {
        description: error.message,
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Cuéntanos tu Idea</h1>
        <p className="text-muted-foreground">
          Escribe tu idea con tus propias palabras. Nuestra IA la estructurará profesionalmente para ti.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Tu Proyecto
          </CardTitle>
          <CardDescription>
            No te preocupes por los detalles técnicos, solo cuéntanos qué quieres hacer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCreate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">¿Cómo se llama tu proyecto?</Label>
              <Input
                id="title"
                placeholder="Ej: App para vender ropa usada entre estudiantes"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Escribe un nombre simple, no te preocupes si no suena profesional aún
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective">¿Qué quieres lograr?</Label>
              <Textarea
                id="objective"
                placeholder="Ej: Quiero ayudar a los estudiantes a ahorrar dinero en ropa y contribuir al medio ambiente"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                disabled={loading}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Cuéntanos el beneficio principal que quieres lograr
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="problem">¿Qué problema estás resolviendo?</Label>
              <Textarea
                id="problem"
                placeholder="Ej: Los estudiantes no tienen mucho dinero y comprar ropa nueva es muy caro. Además, mucha ropa usada termina en la basura."
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                disabled={loading}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                ¿Quién tiene este problema y por qué les molesta?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">¿Qué funcionalidades básicas debería tener?</Label>
              <Textarea
                id="scope"
                placeholder="Ej: Los usuarios pueden subir fotos de su ropa, poner precios, chatear con compradores, y organizar entregas"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                disabled={loading}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Describe las cosas que los usuarios podrán hacer en tu app
              </p>
            </div>

            <div className="space-y-4 rounded-lg border p-4">
              <h3 className="text-sm font-medium">Validaciones Opcionales</h3>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="competition">Validar Competencia</Label>
                  <p className="text-sm text-muted-foreground">
                    Analizar si existen soluciones similares
                  </p>
                </div>
                <Switch
                  id="competition"
                  checked={validateCompetition}
                  onCheckedChange={setValidateCompetition}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="monetization">Validar Monetización</Label>
                  <p className="text-sm text-muted-foreground">
                    Pensar en cómo generar ingresos
                  </p>
                </div>
                <Switch
                  id="monetization"
                  checked={validateMonetization}
                  onCheckedChange={setValidateMonetization}
                  disabled={loading}
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Estructurando tu idea con IA...
                </>
              ) : (
                <>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Crear y Mejorar mi Idea
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
