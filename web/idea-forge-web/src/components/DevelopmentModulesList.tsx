"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Package, ChevronRight, Clock, CheckCircle, Loader2 } from "lucide-react";

type DevelopmentModule = {
  id: string;
  architecture_id: string;
  name: string;
  description: string;
  functionality: string;
  dependencies: string;
  technical_details: string;
  priority: number;
  status: string;
};

type DevelopmentModulesListProps = {
  modules: DevelopmentModule[];
  onModuleClick?: (module: DevelopmentModule) => void;
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: {
    icon: <Clock className="h-3 w-3" />,
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    label: "Pendiente",
  },
  in_progress: {
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    label: "En progreso",
  },
  completed: {
    icon: <CheckCircle className="h-3 w-3" />,
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    label: "Completado",
  },
};

export default function DevelopmentModulesList({
  modules,
  onModuleClick,
}: DevelopmentModulesListProps) {
  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Package className="h-12 w-12 text-muted-foreground opacity-50 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          No hay módulos de desarrollo
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Los módulos se generarán automáticamente con la arquitectura
        </p>
      </div>
    );
  }

  const parseDependencies = (deps: string): string[] => {
    if (!deps) return [];
    try {
      return JSON.parse(deps);
    } catch {
      return [];
    }
  };

  // Sort modules by priority
  const sortedModules = [...modules].sort((a, b) => a.priority - b.priority);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-sm">Módulos de Desarrollo</h3>
          <Badge variant="secondary" className="ml-auto">
            {modules.length}
          </Badge>
        </div>

        {sortedModules.map((module, index) => {
          const status = statusConfig[module.status] || statusConfig.pending;
          const dependencies = parseDependencies(module.dependencies);

          return (
            <div
              key={module.id}
              className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => onModuleClick?.(module)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                    {index + 1}
                  </span>
                  <h4 className="font-medium text-sm truncate">{module.name}</h4>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${status.color}`}>
                  {status.icon}
                  <span className="ml-1">{status.label}</span>
                </Badge>
              </div>

              {module.description && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {module.description}
                </p>
              )}

              {dependencies.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {dependencies.slice(0, 3).map((dep) => (
                    <Badge key={dep} variant="secondary" className="text-xs">
                      {dep}
                    </Badge>
                  ))}
                  {dependencies.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{dependencies.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end mt-2">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
