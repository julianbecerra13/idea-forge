"use client";

import { use, useEffect, useState } from "react";
import { getArchitecture, getActionPlan, getIdea, getModulesByArchitectureId } from "@/lib/api";
import ArchitectureCardsEditable from "@/components/ArchitectureCardsEditable";
import ModuleStepper from "@/components/modules/ModuleStepper";
import GlobalSidePanel from "@/components/GlobalSidePanel";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { Code } from "lucide-react";
import { usePropagation } from "@/contexts/PropagationContext";

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
  functional_requirements: string;
  non_functional_requirements: string;
  business_logic_flow: string;
  completed: boolean;
};

type Idea = {
  ID: string;
  Title: string;
  Objective: string;
  Problem: string;
  Scope: string;
  Completed: boolean;
};

type IdeaContext = {
  title: string;
  objective: string;
  problem: string;
  scope: string;
};

type PlanContext = {
  functional_requirements: string;
  non_functional_requirements: string;
  business_logic_flow: string;
};

type DevelopmentModule = {
  id: string;
  architecture_id: string;
  name: string;
  description: string;
  functionality: string;
  dependencies: string;
  technical_details: string;
  priority: number;
  status: string;
};

export default function ArchitecturePage({ params }: { params: Params }) {
  const { id } = use(params);
  const [architecture, setArchitecture] = useState<Architecture | null>(null);
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [ideaContext, setIdeaContext] = useState<IdeaContext | undefined>(undefined);
  const [planContext, setPlanContext] = useState<PlanContext | undefined>(undefined);
  const [devModules, setDevModules] = useState<DevelopmentModule[]>([]);
  const [loading, setLoading] = useState(true);

  const { state, clearModuleUpdate } = usePropagation();

  const loadArchitecture = async () => {
    try {
      setLoading(true);
      const archData = await getArchitecture(id);
      setArchitecture(archData);

      // Cargar módulos de desarrollo
      try {
        const modulesData = await getModulesByArchitectureId(archData.id);
        setDevModules(modulesData || []);
      } catch (error) {
        console.error("Error loading dev modules:", error);
        setDevModules([]);
      }

      // Cargar action plan para el stepper y contexto
      if (archData.action_plan_id) {
        try {
          const planData = await getActionPlan(archData.action_plan_id);
          setActionPlan(planData);
          setPlanContext({
            functional_requirements: planData.functional_requirements || "",
            non_functional_requirements: planData.non_functional_requirements || "",
            business_logic_flow: planData.business_logic_flow || "",
          });

          // Cargar idea para el stepper y contexto
          if (planData.idea_id) {
            try {
              const ideaData = await getIdea(planData.idea_id);
              setIdea(ideaData);
              setIdeaContext({
                title: ideaData.Title,
                objective: ideaData.Objective,
                problem: ideaData.Problem,
                scope: ideaData.Scope,
              });
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
    return <LoadingState variant="cards" count={7} />;
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
    <div className="space-y-6">
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
          modulesWithUpdates={state.modulesWithUpdates}
          onModuleVisited={clearModuleUpdate}
        />
      )}

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Code className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Arquitectura</h1>
            {ideaContext && (
              <p className="text-sm text-muted-foreground">
                Basado en: &quot;{ideaContext.title}&quot;
              </p>
            )}
          </div>
        </div>
        <p className="text-muted-foreground">
          Click en cualquier sección para editarla con ayuda del Arquitecto de Software
        </p>
      </div>

      {/* Cards Editables */}
      <ArchitectureCardsEditable
        architecture={architecture}
        ideaId={idea?.ID}
        actionPlanId={actionPlan?.id}
        ideaContext={ideaContext}
        planContext={planContext}
        onUpdate={loadArchitecture}
      />

      {/* Global Side Panel */}
      {idea && (
        <GlobalSidePanel
          ideaId={idea.ID}
          architectureId={architecture.id}
          modules={devModules}
          onModulesChange={loadArchitecture}
          autoOpen={true}
        />
      )}
    </div>
  );
}
