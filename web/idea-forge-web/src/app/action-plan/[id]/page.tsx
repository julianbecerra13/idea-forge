"use client";

import { use, useEffect, useState } from "react";
import { getActionPlan } from "@/lib/api";
import ActionPlanEditor from "@/components/ActionPlanEditor";
import ActionPlanChat from "@/components/ActionPlanChat";
import ModuleStepper from "@/components/modules/ModuleStepper";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import { FileText } from "lucide-react";

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

export default function ActionPlanPage({ params }: { params: Params }) {
  const { id } = use(params);
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPlan = async () => {
    try {
      const data = await getActionPlan(id);
      setPlan(data);
    } catch (error) {
      console.error("Error loading action plan:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan();
  }, [id]);

  if (loading) {
    return <LoadingState variant="page" count={2} />;
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
    <div className="h-full space-y-4">
      {/* Module Stepper */}
      <ModuleStepper
        ideaId={plan.idea_id}
        actionPlanId={plan.id}
        currentModule={2}
        ideaCompleted={true} // Si existe action plan, la idea está completada
        actionPlanCompleted={plan.completed}
      />

      {/* Header */}
      <PageHeader
        title="Plan de Acción"
        description="Define requerimientos funcionales, no funcionales y flujo de lógica de negocio"
        icon={FileText}
        badge={plan.completed ? "Completado" : undefined}
        badgeVariant="default"
      />

      {/* Layout: Editor + Chat */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px] h-[calc(100vh-20rem)]">
        {/* Panel Izquierdo: Editor de Plan */}
        <div className="overflow-auto">
          <ActionPlanEditor plan={plan} onUpdate={loadPlan} />
        </div>

        {/* Panel Derecho: Chat con Agente */}
        <div className="h-full overflow-hidden">
          <ActionPlanChat
            actionPlanId={plan.id}
            onPlanUpdate={loadPlan}
            isCompleted={plan.completed}
          />
        </div>
      </div>
    </div>
  );
}
