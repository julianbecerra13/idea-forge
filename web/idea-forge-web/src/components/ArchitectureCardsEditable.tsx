"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import ArchitectureSectionModal from "@/components/ArchitectureSectionModal";
import { toast } from "sonner";
import { updateArchitecture } from "@/lib/api";

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
  ideaContext,
  planContext,
  onUpdate,
}: {
  architecture: Architecture;
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
  const [saving, setSaving] = useState(false);

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

  const renderCard = (sectionKey: SectionKey) => {
    const config = sectionConfig[sectionKey];
    const value = getValue(sectionKey);

    return (
      <Card
        key={sectionKey}
        className="transition-all hover:shadow-md cursor-pointer group flex flex-col min-h-[300px]"
        onClick={() => setEditingSection(sectionKey)}
      >
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
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
          <p className="mt-2 text-xs text-primary font-medium flex-shrink-0">Click para editar con IA</p>
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

        {/* Top Row: 3 cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {topSections.map(renderCard)}
        </div>

        {/* Bottom Row: 4 cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          isCompleted={architecture.completed}
        />
      )}
    </>
  );
}
