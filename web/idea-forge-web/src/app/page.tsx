import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, MessageSquare, Target } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Bienvenido a Idea Forge</h1>
        <p className="text-xl text-muted-foreground">
          Estructura y valida tus ideas con ayuda de inteligencia artificial
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <Lightbulb className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Crea Ideas</CardTitle>
            <CardDescription>
              Define tu proyecto con objetivo, problema y alcance
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <MessageSquare className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Conversa con IA</CardTitle>
            <CardDescription>
              Interactúa con el agente de ideación para refinar tu concepto
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Target className="mb-2 h-8 w-8 text-primary" />
            <CardTitle>Valida y Estructura</CardTitle>
            <CardDescription>
              Analiza competencia y monetización para tu proyecto
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comienza Ahora</CardTitle>
          <CardDescription>
            Crea tu primera idea y empieza a trabajar con el agente de ideación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/ideation">
            <Button size="lg">
              <Lightbulb className="mr-2 h-4 w-4" />
              Crear Nueva Idea
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
