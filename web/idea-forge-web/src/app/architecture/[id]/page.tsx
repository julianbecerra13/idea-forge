"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getArchitecture, getActionPlan, getIdea } from "@/lib/api";
import ArchitectureEditor from "@/components/ArchitectureEditor";
import ArchitectureChat from "@/components/ArchitectureChat";
import ModuleStepper from "@/components/modules/ModuleStepper";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquare, Code } from "lucide-react";

type Params = Promise<{ id: string }>;

type Architecture = {
  id: string;
  action_plan_id: string;
  status: string;
  user_stories: string;
  database_type: string;
  database_schema: string;
  entities_relationships: string;
  tech_stack: string;
  architecture_pattern: string;
  system_architecture: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

type ActionPlan = {
  id: string;
  idea_id: string;
  completed: boolean;
};

type Idea = {
  ID: string;
  Completed: boolean;
};

export default function ArchitecturePage({ params }: { params: Params }) {
  const { id } = use(params);
  const router = useRouter();
  const [architecture, setArchitecture] = useState<Architecture | null>(null);
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [loading, setLoading] = useState(true);

  const loadArchitecture = async () => {
    try {
      setLoading(true);
      const archData = await getArchitecture(id);
      setArchitecture(archData);

      // Cargar action plan para el stepper
      if (archData.action_plan_id) {
        try {
          const planData = await getActionPlan(archData.action_plan_id);
          setActionPlan(planData);

          // Cargar idea para el stepper
          if (planData.idea_id) {
            try {
              const ideaData = await getIdea(planData.idea_id);
              setIdea(ideaData);
            } catch (error) {
              console.error("Error loading idea:", error);
            }
          }
        } catch (error) {
          console.error("Error loading action plan:", error);
        }
      }
    } catch (error) {
      console.error("Error loading architecture:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArchitecture();
  }, [id]);

  if (loading) {
    return <LoadingState variant="page" />;
  }

  if (!architecture) {
    return (
      <EmptyState
        icon={Code}
        title="Arquitectura no encontrada"
        description="Verifica que el ID sea correcto"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Module Stepper */}
      {idea && actionPlan && (
        <ModuleStepper
          ideaId={idea.ID}
          actionPlanId={actionPlan.id}
          architectureId={architecture.id}
          currentModule={3}
          ideaCompleted={idea.Completed}
          actionPlanCompleted={actionPlan.completed}
          architectureCompleted={architecture.completed}
        />
      )}

      {/* Layout Desktop: 2 paneles */}
      <div className="hidden h-[calc(100vh-16rem)] gap-6 lg:grid lg:grid-cols-[1fr_380px]">
        {/* Panel Izquierdo: Editor */}
        <div className="overflow-auto">
          <ArchitectureEditor architecture={architecture} onUpdate={loadArchitecture} />
        </div>

        {/* Panel Derecho: Chat */}
        <div className="h-full overflow-hidden">
          <ArchitectureChat
            architectureId={architecture.id}
            onMessageSent={loadArchitecture}
            isCompleted={architecture.completed}
          />
        </div>
      </div>

      {/* Layout Móvil/Tablet: Chat en Sheet */}
      <div className="lg:hidden">
        <div className="space-y-6">
          <div className="flex items-start justify-end">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="lg" className="gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat con Arquitecto
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
                <div className="h-full">
                  <ArchitectureChat
                    architectureId={architecture.id}
                    onMessageSent={loadArchitecture}
                    isCompleted={architecture.completed}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <ArchitectureEditor architecture={architecture} onUpdate={loadArchitecture} />
        </div>

        {/* Botón flotante para móvil */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              size="icon"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg md:hidden"
            >
              <MessageSquare className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full p-0">
            <div className="h-full">
              <ArchitectureChat
                architectureId={architecture.id}
                onMessageSent={loadArchitecture}
                isCompleted={architecture.completed}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
