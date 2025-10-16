"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, Lightbulb, FileText, Code } from "lucide-react";
import { cn } from "@/lib/utils";

type Module = {
  id: number;
  name: string;
  path: string;
  icon: React.ElementType;
  completed: boolean;
  available: boolean;
};

type ModuleStepperProps = {
  ideaId: string;
  actionPlanId?: string;
  architectureId?: string;
  currentModule: number; // 1 = Ideación, 2 = Plan de Acción, 3 = Arquitectura...
  ideaCompleted: boolean;
  actionPlanCompleted?: boolean;
  architectureCompleted?: boolean;
};

export default function ModuleStepper({
  ideaId,
  actionPlanId,
  architectureId,
  currentModule,
  ideaCompleted,
  actionPlanCompleted = false,
  architectureCompleted = false,
}: ModuleStepperProps) {
  const router = useRouter();

  const modules: Module[] = [
    {
      id: 1,
      name: "Ideación",
      path: `/ideation/${ideaId}`,
      icon: Lightbulb,
      completed: ideaCompleted,
      available: true, // Siempre disponible
    },
    {
      id: 2,
      name: "Plan de Acción",
      path: actionPlanId ? `/action-plan/${actionPlanId}` : "#",
      icon: FileText,
      completed: actionPlanCompleted,
      available: ideaCompleted, // Solo disponible si idea está completada
    },
    {
      id: 3,
      name: "Arquitectura",
      path: architectureId ? `/architecture/${architectureId}` : "#",
      icon: Code,
      completed: architectureCompleted,
      available: actionPlanCompleted, // Solo disponible si plan está completado
    },
  ];

  const currentModuleData = modules.find((m) => m.id === currentModule);
  const canGoBack = currentModule > 1;
  const canGoForward = currentModule < modules.length && modules[currentModule]?.available;

  const handleNavigate = (moduleId: number) => {
    const targetModule = modules.find((m) => m.id === moduleId);
    if (!targetModule || !targetModule.available || targetModule.path === "#") {
      return;
    }
    router.push(targetModule.path);
  };

  const handlePrevious = () => {
    if (canGoBack) {
      handleNavigate(currentModule - 1);
    }
  };

  const handleNext = () => {
    if (canGoForward) {
      handleNavigate(currentModule + 1);
    }
  };

  return (
    <div className="flex items-center gap-4 p-4 bg-card border rounded-lg">
      {/* Botón anterior */}
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        disabled={!canGoBack}
        className="shrink-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Barra de progreso */}
      <div className="flex-1 flex items-center gap-2">
        {modules.map((module, index) => {
          const Icon = module.icon;
          const isActive = module.id === currentModule;
          const isCurrent = module.id === currentModule;

          return (
            <div key={module.id} className="flex items-center flex-1">
              {/* Step */}
              <button
                onClick={() => handleNavigate(module.id)}
                disabled={!module.available || module.path === "#"}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                  "hover:bg-accent disabled:cursor-not-allowed",
                  isActive && "bg-primary/10 ring-2 ring-primary",
                  module.completed && "bg-green-50 dark:bg-green-950",
                  !module.available && "opacity-40"
                )}
              >
                {/* Icon/Check */}
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full transition-colors shrink-0",
                    isActive && "bg-primary text-primary-foreground",
                    module.completed && !isActive && "bg-green-600 text-white",
                    !isActive && !module.completed && module.available && "bg-muted",
                    !module.available && "bg-muted/50"
                  )}
                >
                  {module.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                {/* Label */}
                <div className="text-left hidden sm:block">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isActive && "text-primary",
                      module.completed && !isActive && "text-green-700 dark:text-green-400",
                      !module.available && "text-muted-foreground"
                    )}
                  >
                    {module.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {module.completed
                      ? "Completado"
                      : isCurrent
                      ? "Actual"
                      : !module.available
                      ? "Bloqueado"
                      : "Disponible"}
                  </p>
                </div>
              </button>

              {/* Conector */}
              {index < modules.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 mx-2 transition-colors",
                    module.completed ? "bg-green-600" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Botón siguiente */}
      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        disabled={!canGoForward}
        className="shrink-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
