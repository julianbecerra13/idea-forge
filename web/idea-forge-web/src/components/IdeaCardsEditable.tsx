"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, AlertCircle, Maximize2, CheckCircle, XCircle, Edit2 } from "lucide-react";
import SectionEditModal from "@/components/SectionEditModal";
import { toast } from "sonner";
import { updateIdea } from "@/lib/api";

type Idea = {
  ID: string;
  Title: string;
  Objective: string;
  Problem: string;
  Scope: string;
  ValidateCompetition: boolean;
  ValidateMonetization: boolean;
  Completed?: boolean;
  CreatedAt: string;
};

type SectionKey = "title" | "objective" | "problem" | "scope";

const sectionTitles: Record<SectionKey, string> = {
  title: "Título del Proyecto",
  objective: "Objetivo",
  problem: "Problema que Resuelve",
  scope: "Alcance del MVP",
};

const sectionIcons: Record<SectionKey, React.ReactNode> = {
  title: <Target className="h-5 w-5 text-primary" />,
  objective: <CheckCircle className="h-5 w-5 text-green-600" />,
  problem: <AlertCircle className="h-5 w-5 text-amber-600" />,
  scope: <Maximize2 className="h-5 w-5 text-blue-600" />,
};

export default function IdeaCardsEditable({
  idea: initialIdea,
  onUpdate
}: {
  idea: Idea;
  onUpdate?: () => void;
}) {
  const [idea, setIdea] = useState(initialIdea);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (section: SectionKey, newValue: string) => {
    setSaving(true);
    try {
      const updates: Partial<Idea> = {
        Title: idea.Title,
        Objective: idea.Objective,
        Problem: idea.Problem,
        Scope: idea.Scope,
      };

      // Actualizar el campo específico
      if (section === "title") updates.Title = newValue;
      if (section === "objective") updates.Objective = newValue;
      if (section === "problem") updates.Problem = newValue;
      if (section === "scope") updates.Scope = newValue;

      const updatedIdea = await updateIdea(idea.ID, {
        title: updates.Title!,
        objective: updates.Objective!,
        problem: updates.Problem!,
        scope: updates.Scope!,
        validate_competition: idea.ValidateCompetition,
        validate_monetization: idea.ValidateMonetization,
        completed: idea.Completed,
      });

      setIdea(updatedIdea);
      toast.success("Sección actualizada exitosamente");
      onUpdate?.();
    } catch (error) {
      console.error("Error updating idea:", error);
      toast.error("Error al actualizar la sección");
    } finally {
      setSaving(false);
    }
  };

  const ideaForModal = {
    id: idea.ID,
    title: idea.Title,
    objective: idea.Objective,
    problem: idea.Problem,
    scope: idea.Scope,
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Card: Título */}
        <Card className="transition-all hover:shadow-md cursor-pointer group" onClick={() => setEditingSection("title")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                {sectionIcons.title}
                Título
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSection("title");
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-base font-medium">{idea.Title}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Click para editar con IA
            </p>
          </CardContent>
        </Card>

        {/* Card: Objetivo */}
        <Card className="transition-all hover:shadow-md cursor-pointer group" onClick={() => setEditingSection("objective")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                {sectionIcons.objective}
                Objetivo
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSection("objective");
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground line-clamp-3">{idea.Objective}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Click para editar con IA
            </p>
          </CardContent>
        </Card>

        {/* Card: Problema */}
        <Card className="transition-all hover:shadow-md cursor-pointer group" onClick={() => setEditingSection("problem")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                {sectionIcons.problem}
                Problema
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSection("problem");
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground line-clamp-3">{idea.Problem}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Click para editar con IA
            </p>
          </CardContent>
        </Card>

        {/* Card: Alcance */}
        <Card className="transition-all hover:shadow-md cursor-pointer group" onClick={() => setEditingSection("scope")}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                {sectionIcons.scope}
                Alcance
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingSection("scope");
                }}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground line-clamp-3">{idea.Scope}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant={idea.ValidateCompetition ? "default" : "secondary"}>
                {idea.ValidateCompetition ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                Competencia
              </Badge>
              <Badge variant={idea.ValidateMonetization ? "default" : "secondary"}>
                {idea.ValidateMonetization ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
                Monetización
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Click para editar con IA
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modales de Edición */}
      {editingSection && (
        <SectionEditModal
          open={!!editingSection}
          onOpenChange={(open) => !open && setEditingSection(null)}
          sectionKey={editingSection}
          sectionTitle={sectionTitles[editingSection]}
          currentValue={
            editingSection === "title" ? idea.Title :
            editingSection === "objective" ? idea.Objective :
            editingSection === "problem" ? idea.Problem :
            idea.Scope
          }
          idea={ideaForModal}
          onSave={(newValue) => handleSave(editingSection, newValue)}
        />
      )}
    </>
  );
}
