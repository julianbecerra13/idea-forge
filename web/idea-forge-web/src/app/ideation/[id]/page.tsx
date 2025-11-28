"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getIdea, getActionPlanByIdeaId, updateIdea, createActionPlan } from "@/lib/api";
import IdeaCardsEditable from "@/components/IdeaCardsEditable";
import ModuleStepper from "@/components/modules/ModuleStepper";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Lightbulb, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Params = Promise<{ id: string }>;

type Idea = {
  ID: string;
  Title: string;
  Objective: string;
  Problem: string;
  Scope: string;
  ValidateCompetition: boolean;
  ValidateMonetization: boolean;
  Completed: boolean;
  CreatedAt: string;
};

type ActionPlan = {
  id: string;
  completed: boolean;
};

export default function IdeationPage({ params }: { params: Params }) {
  const { id } = use(params);
  const router = useRouter();
  const [idea, setIdea] = useState<Idea | null>(null);
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [proceeding, setProceeding] = useState(false);

  const loadIdea = async () => {
    try {
      const data = await getIdea(id);
      setIdea(data);

      // Si la idea está completada, buscar el action plan
      if (data.Completed) {
        try {
          const planData = await getActionPlanByIdeaId(id);
          setActionPlan(planData);
        } catch (error) {
          // No hay action plan aún
          setActionPlan(null);
        }
      }
    } catch (error) {
      console.error("Error loading idea:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdea();
  }, [id]);

  const handleProceedToActionPlan = async () => {
    if (!idea) return;

    setProceeding(true);
    try {
      // 1. Marcar idea como completada
      await updateIdea(idea.ID, { completed: true });

      // 2. Crear el Plan de Acción (la IA lo genera automáticamente)
      const newActionPlan = await createActionPlan(idea.ID);

      toast.success("Plan de Acción creado exitosamente");

      // 3. Navegar al Plan de Acción
      router.push(`/action-plan/${newActionPlan.id}`);
    } catch (error: any) {
      console.error("Error proceeding to action plan:", error);
      if (error.response?.status === 429) {
        toast.error("Límite de peticiones excedido. Espera un momento.");
      } else if (error.response?.status === 503) {
        toast.error("La IA está temporalmente no disponible. Espera 1-2 minutos.");
      } else {
        toast.error("Error al crear el Plan de Acción");
      }
      setProceeding(false);
    }
  };

  if (loading) {
    return <LoadingState variant="cards" count={4} />;
  }

  if (!idea) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="Idea no encontrada"
        description="Verifica que el ID sea correcto"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Module Stepper */}
      <ModuleStepper
        ideaId={idea.ID}
        actionPlanId={actionPlan?.id}
        currentModule={1}
        ideaCompleted={idea.Completed}
        actionPlanCompleted={actionPlan?.completed}
      />

      {/* Layout con Cards Editables - sin chat lateral */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{idea.Title}</h1>
          <p className="text-sm text-muted-foreground">
            Click en cualquier sección para editarla con ayuda de la IA
          </p>
        </div>
        <IdeaCardsEditable idea={idea} onUpdate={loadIdea} />
      </div>

      {/* Botón para marcar como completado */}
      {!idea.Completed && (
        <div className="flex justify-end pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" variant="outline" className="gap-2">
                Marcar como Completado
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Marcar idea como completada?</AlertDialogTitle>
                <AlertDialogDescription>
                  Al marcar como completada, podrás continuar al siguiente módulo: Plan de Acción.
                  <p className="mt-2 text-sm">
                    Aún podrás editar la idea después si lo necesitas.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={async () => {
                  await updateIdea(idea.ID, { completed: true });
                  toast.success("Idea marcada como completada");
                  loadIdea();
                }}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Botón para continuar al siguiente módulo (cuando está completada pero no hay plan) */}
      {idea.Completed && !actionPlan && (
        <div className="flex justify-end pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" className="gap-2" disabled={proceeding}>
                {proceeding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando Plan de Acción...
                  </>
                ) : (
                  <>
                    Continuar a Plan de Acción
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Continuar al Plan de Acción?</AlertDialogTitle>
                <AlertDialogDescription>
                  La IA analizará tu idea y generará automáticamente:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Requerimientos Funcionales</li>
                    <li>Requerimientos No Funcionales</li>
                    <li>Flujo de Lógica de Negocio</li>
                  </ul>
                  <p className="mt-3 text-sm">
                    Podrás editar cada sección después con ayuda de la IA.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleProceedToActionPlan}>
                  Continuar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Si ya está completada y hay plan, mostrar botón para ir al plan existente */}
      {idea.Completed && actionPlan && (
        <div className="flex justify-end pt-4">
          <Button
            size="lg"
            className="gap-2"
            onClick={() => router.push(`/action-plan/${actionPlan.id}`)}
          >
            Ir a Plan de Acción
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
