"use client";

import { use, useEffect, useState } from "react";
import { getActionPlan } from "@/lib/api";
import ActionPlanEditor from "@/components/ActionPlanEditor";
import ActionPlanChat from "@/components/ActionPlanChat";
import { Skeleton } from "@/components/ui/skeleton";
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
    return (
      <div className="h-full space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <Skeleton className="h-[600px]" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">Plan de Acción no encontrado</p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifica que el ID sea correcto
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-primary" />
          Plan de Acción
        </h1>
        <p className="text-sm text-muted-foreground">
          Define requerimientos funcionales, no funcionales y flujo de lógica de negocio
        </p>
      </div>

      {/* Layout: Editor + Chat */}
      <div className="grid gap-6 lg:grid-cols-[1fr_400px] h-[calc(100vh-12rem)]">
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
