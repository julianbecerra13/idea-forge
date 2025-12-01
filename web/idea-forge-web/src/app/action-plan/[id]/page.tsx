"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getActionPlan,
  getArchitectureByActionPlanId,
  getIdea,
  updateActionPlan,
  createArchitecture
} from "@/lib/api";
import ActionPlanCardsEditable from "@/components/ActionPlanCardsEditable";
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
import { FileText, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePropagation } from "@/contexts/PropagationContext";

type Params = Promise<{ id: string }>;

type ActionPlan = {
  id: string;
  idea_id: string;
  status: string;
  functional_requirements: string;
  non_functional_requirements: string;
  business_logic_flow: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

type IdeaContext = {
  title: string;
  objective: string;
  problem: string;
  scope: string;
};

export default function ActionPlanPage({ params }: { params: Params }) {
  const { id } = use(params);
  const router = useRouter();
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [ideaContext, setIdeaContext] = useState<IdeaContext | undefined>(undefined);
  const [architectureId, setArchitectureId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [proceeding, setProceeding] = useState(false);

  const { state, clearModuleUpdate } = usePropagation();

  const loadPlan = async () => {
    try {
      const data = await getActionPlan(id);
      setPlan(data);

      // Cargar contexto de la idea
      if (data.idea_id) {
        try {
          const idea = await getIdea(data.idea_id);
          setIdeaContext({
            title: idea.Title,
            objective: idea.Objective,
            problem: idea.Problem,
            scope: idea.Scope,
          });
        } catch (error) {
          console.error("Error loading idea context:", error);
        }
      }

      // Intentar cargar arquitectura si existe
      if (data.completed) {
        try {
          const architecture = await getArchitectureByActionPlanId(data.id);
          if (architecture) {
            setArchitectureId(architecture.id);
          }
        } catch (error) {
          // No hay arquitectura aún, está bien
        }
      }
    } catch (error) {
      console.error("Error loading action plan:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [id]);

  const handleProceedToArchitecture = async () => {
    if (!plan) return;

    setProceeding(true);
    try {
      // 1. Marcar plan de acción como completado
      await updateActionPlan(plan.id, { completed: true });

      // 2. Crear la Arquitectura (la IA la genera automáticamente)
      const newArchitecture = await createArchitecture(plan.id);

      toast.success("Arquitectura creada exitosamente");

      // 3. Navegar a la Arquitectura
      router.push(`/architecture/${newArchitecture.id}`);
    } catch (error: any) {
      console.error("Error proceeding to architecture:", error);
      if (error.response?.status === 429) {
        toast.error("Límite de peticiones excedido. Espera un momento.");
      } else if (error.response?.status === 503) {
        toast.error("La IA está temporalmente no disponible. Espera 1-2 minutos.");
      } else {
        toast.error("Error al crear la Arquitectura");
      }
      setProceeding(false);
    }
  };

  if (loading) {
    return <LoadingState variant="cards" count={3} />;
  }

  if (!plan) {
    return (
      <EmptyState
        icon={FileText}
        title="Plan de Acción no encontrado"
        description="Verifica que el ID sea correcto"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Module Stepper */}
      <ModuleStepper
        ideaId={plan.idea_id}
        actionPlanId={plan.id}
        architectureId={architectureId}
        currentModule={2}
        ideaCompleted={true}
        actionPlanCompleted={plan.completed}
        modulesWithUpdates={state.modulesWithUpdates}
        onModuleVisited={clearModuleUpdate}
      />

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Plan de Acción</h1>
            {ideaContext && (
              <p className="text-sm text-muted-foreground">
                Basado en: &quot;{ideaContext.title}&quot;
              </p>
            )}
          </div>
        </div>
        {!architectureId && (
          <p className="text-muted-foreground">
            Click en cualquier sección para editarla con ayuda de la IA
          </p>
        )}
      </div>

      {/* Cards Editables */}
      <ActionPlanCardsEditable
        plan={plan}
        ideaContext={ideaContext}
        onUpdate={loadPlan}
        isLocked={!!architectureId}
      />

      {/* Botón para marcar como completado */}
      {!plan.completed && (
        <div className="flex justify-end pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" variant="outline" className="gap-2">
                Marcar como Completado
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Marcar Plan de Acción como completado?</AlertDialogTitle>
                <AlertDialogDescription>
                  Al marcar como completado, podrás continuar al siguiente módulo: Arquitectura.
                  <p className="mt-2 text-sm">
                    Aún podrás editar el plan después si lo necesitas.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={async () => {
                  await updateActionPlan(plan.id, { completed: true });
                  toast.success("Plan de Acción marcado como completado");
                  loadPlan();
                }}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Botón para continuar al siguiente módulo (cuando está completado pero no hay arquitectura) */}
      {plan.completed && !architectureId && (
        <div className="flex justify-end pt-4">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="lg" className="gap-2" disabled={proceeding}>
                {proceeding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generando Arquitectura...
                  </>
                ) : (
                  <>
                    Continuar a Arquitectura
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Continuar a Arquitectura?</AlertDialogTitle>
                <AlertDialogDescription>
                  La IA analizará tu Plan de Acción y generará automáticamente:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Historias de Usuario</li>
                    <li>Tipo y Esquema de Base de Datos</li>
                    <li>Entidades y Relaciones</li>
                    <li>Stack Tecnológico</li>
                    <li>Patrón y Arquitectura del Sistema</li>
                  </ul>
                  <p className="mt-3 text-sm">
                    Podrás editar cada sección después con ayuda de la IA.
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleProceedToArchitecture}>
                  Continuar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Si ya está completado y hay arquitectura, mostrar botón para ir */}
      {plan.completed && architectureId && (
        <div className="flex justify-end pt-4">
          <Button
            size="lg"
            className="gap-2"
            onClick={() => router.push(`/architecture/${architectureId}`)}
          >
            Ir a Arquitectura
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
