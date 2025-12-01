"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Database,
  Table,
  Network,
  Layers,
  Boxes,
  Server,
  CheckCircle,
  Edit2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import ArchitectureSectionModal from "@/components/ArchitectureSectionModal";
import HighlightedText from "@/components/HighlightedText";
import { toast } from "sonner";
import { updateArchitecture } from "@/lib/api";
import { usePropagation } from "@/contexts/PropagationContext";

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

type SectionKey =
  | "user_stories"
  | "database_type"
  | "database_schema"
  | "entities_relationships"
  | "tech_stack"
  | "architecture_pattern"
  | "system_architecture";

const sectionConfig: Record<
  SectionKey,
  { title: string; icon: React.ReactNode; description: string }
> = {
  user_stories: {
    title: "Historias de Usuario",
    icon: <Users className="h-5 w-5 text-blue-600" />,
    description: "US-XXX: Como [rol], quiero [acción], para [beneficio]",
  },
  database_type: {
    title: "Tipo de Base de Datos",
    icon: <Database className="h-5 w-5 text-green-600" />,
    description: "Relacional, NoSQL o Híbrida con justificación",
  },
  database_schema: {
    title: "Esquema de Base de Datos",
    icon: <Table className="h-5 w-5 text-purple-600" />,
    description: "SQL DDL o estructura JSON del esquema",
  },
  entities_relationships: {
    title: "Entidades y Relaciones",
    icon: <Network className="h-5 w-5 text-orange-600" />,
    description: "Entidades principales y relaciones (1:1, 1:N, N:M)",
  },
  tech_stack: {
    title: "Stack Tecnológico",
    icon: <Layers className="h-5 w-5 text-cyan-600" />,
    description: "Frontend, Backend, BD, Infraestructura",
  },
  architecture_pattern: {
    title: "Patrón de Arquitectura",
    icon: <Boxes className="h-5 w-5 text-pink-600" />,
    description: "MVC, Clean, Hexagonal, Microservicios, etc.",
  },
  system_architecture: {
    title: "Arquitectura del Sistema",
    icon: <Server className="h-5 w-5 text-red-600" />,
    description: "Capas, componentes, flujos, seguridad, escalabilidad",
  },
};

export default function ArchitectureCardsEditable({
  architecture: initialArchitecture,
  ideaId,
  actionPlanId,
  ideaContext,
  planContext,
  onUpdate,
}: {
  architecture: Architecture;
  ideaId?: string;
  actionPlanId?: string;
  ideaContext?: {
    title: string;
    objective: string;
    problem: string;
    scope: string;
  };
  planContext?: {
    functional_requirements: string;
    non_functional_requirements: string;
    business_logic_flow: string;
  };
  onUpdate?: () => void;
}) {
  const [architecture, setArchitecture] = useState(initialArchitecture);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [expandedSection, setExpandedSection] = useState<SectionKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewedSections, setViewedSections] = useState<Set<SectionKey>>(new Set());

  const { state } = usePropagation();

  // Check if a section has unviewed highlights
  const sectionHasUpdate = (sectionKey: SectionKey): boolean => {
    const highlights = state.highlights.architecture[sectionKey];
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
        user_stories: architecture.user_stories,
        database_type: architecture.database_type,
        database_schema: architecture.database_schema,
        entities_relationships: architecture.entities_relationships,
        tech_stack: architecture.tech_stack,
        architecture_pattern: architecture.architecture_pattern,
        system_architecture: architecture.system_architecture,
      };

      updates[section] = newValue;

      await updateArchitecture(architecture.id, updates);

      setArchitecture((prev) => ({ ...prev, [section]: newValue }));
      toast.success("Sección actualizada exitosamente");
      onUpdate?.();
    } catch (error) {
      console.error("Error updating architecture:", error);
      toast.error("Error al actualizar la sección");
    } finally {
      setSaving(false);
    }
  };

  const getValue = (section: SectionKey): string => {
    return architecture[section] || "";
  };


  // Dividir las secciones en dos grupos para mejor layout
  const topSections: SectionKey[] = ["user_stories", "database_type", "database_schema"];
  const bottomSections: SectionKey[] = [
    "entities_relationships",
    "tech_stack",
    "architecture_pattern",
    "system_architecture",
  ];

  const handleCardClick = (sectionKey: SectionKey) => {
    setExpandedSection(expandedSection === sectionKey ? null : sectionKey);
    markSectionAsViewed(sectionKey);
  };

  const handleEditClick = (sectionKey: SectionKey, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSection(sectionKey);
  };

  const renderCard = (sectionKey: SectionKey) => {
    const config = sectionConfig[sectionKey];
    const value = getValue(sectionKey);
    const isExpanded = expandedSection === sectionKey;
    const hasUpdate = sectionHasUpdate(sectionKey);

    return (
      <Card
        key={sectionKey}
        className="transition-all hover:shadow-md cursor-pointer group flex flex-col"
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
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => handleEditClick(sectionKey, e)}
                title="Editar con IA"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground">
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </span>
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
                  module="architecture"
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
          <p className="mt-4 text-xs text-primary font-medium flex-shrink-0">Usa el lápiz para editar con IA</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className="space-y-4">
        {/* Status Badge */}
        {architecture.completed && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300 w-fit">
            <CheckCircle className="h-4 w-4" />
            Completado
          </div>
        )}

        {/* Cards en columna */}
        <div className="flex flex-col gap-6">
          {topSections.map(renderCard)}
          {bottomSections.map(renderCard)}
        </div>
      </div>

      {/* Modal de Edición */}
      {editingSection && (
        <ArchitectureSectionModal
          open={!!editingSection}
          onOpenChange={(open) => !open && setEditingSection(null)}
          sectionKey={editingSection}
          sectionTitle={sectionConfig[editingSection].title}
          currentValue={getValue(editingSection)}
          architectureId={architecture.id}
          ideaId={ideaId}
          actionPlanId={actionPlanId}
          ideaContext={ideaContext}
          planContext={planContext}
          architectureContext={{
            user_stories: architecture.user_stories,
            database_type: architecture.database_type,
            database_schema: architecture.database_schema,
            entities_relationships: architecture.entities_relationships,
            tech_stack: architecture.tech_stack,
            architecture_pattern: architecture.architecture_pattern,
            system_architecture: architecture.system_architecture,
          }}
          onSave={(newValue) => handleSave(editingSection, newValue)}
          onPropagation={onUpdate}
          isCompleted={architecture.completed}
        />
      )}
    </>
  );
}
