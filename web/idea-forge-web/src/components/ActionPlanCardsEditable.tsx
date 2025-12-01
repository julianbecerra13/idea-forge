"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCode, Shield, GitBranch, CheckCircle, Edit2, Lock, ChevronDown, ChevronUp } from "lucide-react";
import ActionPlanSectionModal from "@/components/ActionPlanSectionModal";
import HighlightedText from "@/components/HighlightedText";
import { toast } from "sonner";
import { updateActionPlan } from "@/lib/api";
import { usePropagation } from "@/contexts/PropagationContext";

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
    description: "Define qué debe hacer el sistema",
  },
  non_functional_requirements: {
    title: "Requerimientos No Funcionales",
    icon: <Shield className="h-5 w-5 text-purple-600" />,
    description: "Performance, seguridad, escalabilidad",
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
  isLocked = false,
}: {
  plan: ActionPlan;
  ideaContext?: {
    title: string;
    objective: string;
    problem: string;
    scope: string;
  };
  onUpdate?: () => void;
  isLocked?: boolean;
}) {
  const [plan, setPlan] = useState(initialPlan);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewedSections, setViewedSections] = useState<Set<SectionKey>>(new Set());

  const { state } = usePropagation();

  // Check if a section has unviewed highlights
  const sectionHasUpdate = (sectionKey: SectionKey): boolean => {
    const highlights = state.highlights.action_plan[sectionKey];
    return highlights && highlights.length > 0 && !viewedSections.has(sectionKey);
  };

  // Mark section as viewed when clicking on the card
  const markSectionAsViewed = (sectionKey: SectionKey) => {
    setViewedSections(prev => new Set(prev).add(sectionKey));
  };

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

  const handleCardClick = (sectionKey: SectionKey) => {
    // Toggle expandir/colapsar
    setExpandedSection(expandedSection === sectionKey ? null : sectionKey);
    markSectionAsViewed(sectionKey);
  };

  const handleEditClick = (sectionKey: SectionKey, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      toast.error("No puedes editar el Plan de Acción porque ya existe una Arquitectura basada en él.");
      return;
    }
    setEditingSection(sectionKey);
  };

  return (
    <>
      <div className="space-y-4">
        {/* Banner de bloqueo */}
        {isLocked && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <Lock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Módulo bloqueado</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">No puedes editar el Plan de Acción porque ya existe una Arquitectura basada en él.</p>
            </div>
          </div>
        )}

        {/* Status Badge */}
        {plan.completed && !isLocked && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300 w-fit">
            <CheckCircle className="h-4 w-4" />
            Completado
          </div>
        )}

        {/* Cards en columna */}
        <div className="flex flex-col gap-6">
          {(Object.keys(sectionConfig) as SectionKey[]).map((sectionKey) => {
            const config = sectionConfig[sectionKey];
            const value = getValue(sectionKey);
            const isExpanded = expandedSection === sectionKey;
            const hasUpdate = sectionHasUpdate(sectionKey);

            return (
              <Card
                key={sectionKey}
                className={`transition-all flex flex-col hover:shadow-md cursor-pointer group ${isLocked ? 'opacity-75' : ''}`}
                onClick={() => handleCardClick(sectionKey)}
              >
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <div className="relative">
                        {config.icon}
                        {hasUpdate && (
                          <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                        )}
                      </div>
                      {config.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {!isLocked && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleEditClick(sectionKey, e)}
                          title="Editar con IA"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {isLocked ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <span className="text-muted-foreground">
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{config.description}</p>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-none' : 'max-h-[150px]'}`}>
                    <div className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
                      {value ? (
                        <HighlightedText
                          text={value}
                          module="action_plan"
                          section={sectionKey}
                        />
                      ) : (
                        "Sin contenido. Haz click en el lápiz para agregar."
                      )}
                    </div>
                  </div>
                  {!isExpanded && value && value.length > 200 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Click para ver más...
                    </p>
                  )}
                  {!isLocked && (
                    <p className="mt-4 text-xs text-primary font-medium flex-shrink-0">
                      Usa el lápiz para editar con IA
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Modal de Edición */}
      {editingSection && !isLocked && (
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
          onPropagation={onUpdate}
          isCompleted={plan.completed}
        />
      )}
    </>
  );
}
