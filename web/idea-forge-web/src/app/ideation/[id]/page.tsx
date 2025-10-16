"use client";

import { use, useEffect, useState } from "react";
import { getIdea, getActionPlanByIdeaId } from "@/lib/api";
import IdeaCards from "@/components/IdeaCards";
import ChatPanel from "@/components/ChatPanel";
import ModuleStepper from "@/components/modules/ModuleStepper";
import LoadingState from "@/components/common/LoadingState";
import EmptyState from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MessageSquare, Lightbulb } from "lucide-react";

type Params = Promise<{ id: string }>;

type Idea = {
  ID: string;
  Title: string;
  Objective: string;
  Problem: string;
  Scope: string;
  ValidateCompetition: boolean;
  ValidateMonetization: boolean;
  Completed: boolean;
  CreatedAt: string;
};

type ActionPlan = {
  id: string;
  completed: boolean;
};

export default function IdeationPage({ params }: { params: Params }) {
  const { id } = use(params);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [actionPlan, setActionPlan] = useState<ActionPlan | null>(null);
  const [loading, setLoading] = useState(true);

  const loadIdea = async () => {
    try {
      const data = await getIdea(id);
      setIdea(data);

      // Si la idea está completada, buscar el action plan
      if (data.Completed) {
        try {
          const planData = await getActionPlanByIdeaId(id);
          setActionPlan(planData);
        } catch (error) {
          // No hay action plan aún
          setActionPlan(null);
        }
      }
    } catch (error) {
      console.error("Error loading idea:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdea();
  }, [id]);

  if (loading) {
    return <LoadingState variant="cards" count={4} />;
  }

  if (!idea) {
    return (
      <EmptyState
        icon={Lightbulb}
        title="Idea no encontrada"
        description="Verifica que el ID sea correcto"
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Module Stepper */}
      <ModuleStepper
        ideaId={idea.ID}
        actionPlanId={actionPlan?.id}
        currentModule={1}
        ideaCompleted={idea.Completed}
        actionPlanCompleted={actionPlan?.completed}
      />

      {/* Layout Desktop: 2 paneles */}
      <div className="hidden h-[calc(100vh-16rem)] gap-6 lg:grid lg:grid-cols-[1fr_380px]">
        {/* Panel Izquierdo: Cards */}
        <div className="space-y-6 overflow-auto">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{idea.Title}</h1>
            <p className="text-sm text-muted-foreground">ID: {idea.ID}</p>
          </div>
          <IdeaCards idea={idea} />
        </div>

        {/* Panel Derecho: Chat */}
        <div className="h-full overflow-hidden">
          <ChatPanel ideaId={idea.ID} onMessageSent={loadIdea} isCompleted={idea.Completed} />
        </div>
      </div>

      {/* Layout Móvil/Tablet: Chat en Sheet */}
      <div className="lg:hidden">
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{idea.Title}</h1>
              <p className="text-sm text-muted-foreground">ID: {idea.ID}</p>
            </div>
            <Sheet>
              <SheetTrigger asChild>
                <Button size="lg" className="gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Chat
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full p-0 sm:max-w-lg">
                <div className="h-full">
                  <ChatPanel ideaId={idea.ID} onMessageSent={loadIdea} isCompleted={idea.Completed} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <IdeaCards idea={idea} />
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
              <ChatPanel ideaId={idea.ID} onMessageSent={loadIdea} isCompleted={idea.Completed} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
