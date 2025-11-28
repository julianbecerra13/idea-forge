"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileCode, Shield, GitBranch, CheckCircle, Edit2 } from "lucide-react";
import ActionPlanSectionModal from "@/components/ActionPlanSectionModal";
import { toast } from "sonner";
import { updateActionPlan } from "@/lib/api";

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

type SectionKey = "functional_requirements" | "non_functional_requirements" | "business_logic_flow";

const sectionConfig: Record<SectionKey, { title: string; icon: React.ReactNode; description: string }> = {
  functional_requirements: {
    title: "Requerimientos Funcionales",
    icon: <FileCode className="h-5 w-5 text-blue-600" />,
    description: "Define qué debe hacer el sistema (RF-XXX)",
  },
  non_functional_requirements: {
    title: "Requerimientos No Funcionales",
    icon: <Shield className="h-5 w-5 text-purple-600" />,
    description: "Performance, seguridad, escalabilidad (RNF-XXX)",
  },
  business_logic_flow: {
    title: "Flujo de Lógica de Negocio",
    icon: <GitBranch className="h-5 w-5 text-green-600" />,
    description: "Procesos principales paso a paso",
  },
};

export default function ActionPlanCardsEditable({
  plan: initialPlan,
  ideaContext,
  onUpdate,
}: {
  plan: ActionPlan;
  ideaContext?: {
    title: string;
    objective: string;
    problem: string;
    scope: string;
  };
  onUpdate?: () => void;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (section: SectionKey, newValue: string) => {
    setSaving(true);
    try {
      const updates = {
        functional_requirements: plan.functional_requirements,
        non_functional_requirements: plan.non_functional_requirements,
        business_logic_flow: plan.business_logic_flow,
      };

      updates[section] = newValue;

      await updateActionPlan(plan.id, updates);

      setPlan((prev) => ({ ...prev, [section]: newValue }));
      toast.success("Sección actualizada exitosamente");
      onUpdate?.();
    } catch (error) {
      console.error("Error updating plan:", error);
      toast.error("Error al actualizar la sección");
    } finally {
      setSaving(false);
    }
  };

  const getValue = (section: SectionKey): string => {
    return plan[section] || "";
  };

  return (
    <>
      <div className="space-y-4">
        {/* Status Badge */}
        {plan.completed && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300 w-fit">
            <CheckCircle className="h-4 w-4" />
            Completado
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
          {(Object.keys(sectionConfig) as SectionKey[]).map((sectionKey) => {
            const config = sectionConfig[sectionKey];
            const value = getValue(sectionKey);

            return (
              <Card
                key={sectionKey}
                className="transition-all hover:shadow-md cursor-pointer group flex flex-col min-h-[400px]"
                onClick={() => setEditingSection(sectionKey)}
              >
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {config.icon}
                      {config.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSection(sectionKey);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1 pr-4">
                    <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                      {value || "Click para agregar contenido..."}
                    </pre>
                  </ScrollArea>
                  <p className="mt-3 text-xs text-primary font-medium flex-shrink-0">
                    Click para editar con IA
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal de Edición */}
      {editingSection && (
        <ActionPlanSectionModal
          open={!!editingSection}
          onOpenChange={(open) => !open && setEditingSection(null)}
          sectionKey={editingSection}
          sectionTitle={sectionConfig[editingSection].title}
          currentValue={getValue(editingSection)}
          planId={plan.id}
          ideaId={plan.idea_id}
          ideaContext={ideaContext}
          planContext={{
            functional_requirements: plan.functional_requirements,
            non_functional_requirements: plan.non_functional_requirements,
            business_logic_flow: plan.business_logic_flow,
          }}
          onSave={(newValue) => handleSave(editingSection, newValue)}
          isCompleted={plan.completed}
        />
      )}
    </>
  );
}
