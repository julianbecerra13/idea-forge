"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, AlertCircle, Maximize2, CheckCircle, XCircle, Edit2, Lock } from "lucide-react";
import SectionEditModal from "@/components/SectionEditModal";
import HighlightedText from "@/components/HighlightedText";
import { toast } from "sonner";
import { updateIdea } from "@/lib/api";
import { usePropagation } from "@/contexts/PropagationContext";

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
  onUpdate,
  isLocked = false,
}: {
  idea: Idea;
  onUpdate?: () => void;
  isLocked?: boolean;
}) {
  const [idea, setIdea] = useState(initialIdea);
  const [editingSection, setEditingSection] = useState<SectionKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewedSections, setViewedSections] = useState<Set<SectionKey>>(new Set());

  const { state } = usePropagation();

  // Check if a section has unviewed highlights
  const sectionHasUpdate = (sectionKey: SectionKey): boolean => {
    const highlights = state.highlights.ideation[sectionKey];
    return highlights && highlights.length > 0 && !viewedSections.has(sectionKey);
  };

  // Mark section as viewed when clicking on the card
  const markSectionAsViewed = (sectionKey: SectionKey) => {
    setViewedSections(prev => new Set(prev).add(sectionKey));
  };

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

  const handleCardClick = (section: SectionKey) => {
    markSectionAsViewed(section);
    if (isLocked) {
      toast.error("No puedes editar la idea porque ya existe un Plan de Acción basado en ella.");
      return;
    }
    setEditingSection(section);
  };

  return (
    <>
      {/* Banner de bloqueo */}
      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 px-4 py-3 mb-4">
          <Lock className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Módulo bloqueado</p>
            <p className="text-xs text-amber-600 dark:text-amber-400">No puedes editar la idea porque ya existe un Plan de Acción basado en ella.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* Card: Título */}
        <Card
          className={`transition-all ${isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'} group`}
          onClick={() => handleCardClick("title")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="relative">
                  {sectionIcons.title}
                  {sectionHasUpdate("title") && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </div>
                Título
              </CardTitle>
              {isLocked ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick("title");
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              <HighlightedText text={idea.Title} module="ideation" section="title" />
            </div>
            {!isLocked && (
              <p className="mt-2 text-sm text-muted-foreground">
                Click para editar con IA
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card: Objetivo */}
        <Card
          className={`transition-all ${isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'} group`}
          onClick={() => handleCardClick("objective")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="relative">
                  {sectionIcons.objective}
                  {sectionHasUpdate("objective") && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </div>
                Objetivo
              </CardTitle>
              {isLocked ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick("objective");
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-base text-foreground">
              <HighlightedText text={idea.Objective} module="ideation" section="objective" />
            </div>
            {!isLocked && (
              <p className="mt-2 text-sm text-muted-foreground">
                Click para editar con IA
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card: Problema */}
        <Card
          className={`transition-all ${isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'} group`}
          onClick={() => handleCardClick("problem")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="relative">
                  {sectionIcons.problem}
                  {sectionHasUpdate("problem") && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </div>
                Problema
              </CardTitle>
              {isLocked ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick("problem");
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-base text-foreground">
              <HighlightedText text={idea.Problem} module="ideation" section="problem" />
            </div>
            {!isLocked && (
              <p className="mt-2 text-sm text-muted-foreground">
                Click para editar con IA
              </p>
            )}
          </CardContent>
        </Card>

        {/* Card: Alcance */}
        <Card
          className={`transition-all ${isLocked ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-md cursor-pointer'} group`}
          onClick={() => handleCardClick("scope")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="relative">
                  {sectionIcons.scope}
                  {sectionHasUpdate("scope") && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </div>
                Alcance
              </CardTitle>
              {isLocked ? (
                <Lock className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCardClick("scope");
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-base text-foreground">
              <HighlightedText text={idea.Scope} module="ideation" section="scope" />
            </div>
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
            {!isLocked && (
              <p className="mt-2 text-sm text-muted-foreground">
                Click para editar con IA
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modales de Edición */}
      {editingSection && !isLocked && (
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
