"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Lightbulb, Home, Plus, CheckCircle2, LogOut, User, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeToggle } from "@/components/mode-toggle";
import { useEffect, useState } from "react";
import { listIdeas, getActionPlanByIdeaId, getArchitectureByActionPlanId, deleteIdea } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import { toast } from "sonner";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Idea = {
  ID: string;
  Title: string;
  Completed: boolean;
  CreatedAt: string;
};

interface SidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({ isCollapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [ideaToDelete, setIdeaToDelete] = useState<string | null>(null);

  // Manejar hidratación
  useEffect(() => {
    setMounted(true);
    setUser(getUser());
  }, []);

  useEffect(() => {
    if (mounted) {
      loadIdeas();
    }
  }, [mounted]);

  async function loadIdeas() {
    try {
      setIsLoading(true);
      const data = await listIdeas();
      setIdeas(data || []);
    } catch (error) {
      console.error("Error loading ideas:", error);
      setIdeas([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Función para determinar la última URL del proyecto
  const getProjectUrl = async (idea: Idea) => {
    // Si la idea NO está completada, ir a ideación
    if (!idea.Completed) {
      return `/ideation/${idea.ID}`;
    }

    // Si la idea está completada, buscar el action plan
    try {
      const actionPlan = await getActionPlanByIdeaId(idea.ID);

      if (actionPlan) {
        // Si el action plan está completado, buscar arquitectura
        if (actionPlan.completed) {
          try {
            const architecture = await getArchitectureByActionPlanId(actionPlan.id);
            if (architecture) {
              return `/architecture/${architecture.id}`;
            }
          } catch (error) {
            // No hay arquitectura aún, ir a action plan
          }
        }
        // Si hay action plan, ir ahí
        return `/action-plan/${actionPlan.id}`;
      }
    } catch (error) {
      // No hay action plan, volver a ideación
    }

    // Por defecto, ir a ideación
    return `/ideation/${idea.ID}`;
  };

  const handleProjectClick = async (idea: Idea) => {
    const url = await getProjectUrl(idea);
    router.push(url);
    // Colapsar el sidebar al navegar a un proyecto
    if (onToggle && !isCollapsed) {
      onToggle();
    }
  };

  const handleDeleteClick = (ideaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIdeaToDelete(ideaId);
  };

  const confirmDelete = async () => {
    if (!ideaToDelete) return;

    try {
      await deleteIdea(ideaToDelete);
      toast.success("Proyecto eliminado exitosamente");
      loadIdeas(); // Recargar la lista
      setIdeaToDelete(null);
    } catch (error) {
      console.error("Error deleting idea:", error);
      toast.error("Error al eliminar el proyecto");
    }
  };

  const cancelDelete = () => {
    setIdeaToDelete(null);
  };

  const links = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/ideation", label: "Nueva Idea", icon: Plus },
  ];

  return (
    <>
      {/* Toggle button (siempre visible) */}
      {mounted && (
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "fixed top-4 z-50 transition-all duration-300",
            isCollapsed ? "left-4" : "left-60"
          )}
          onClick={onToggle}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-card transition-all duration-300",
          isCollapsed ? "-translate-x-full lg:-translate-x-full" : "w-60"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <Lightbulb className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Idea Forge</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-hidden p-4 flex flex-col">
            <div className="space-y-1 mb-4">
              {mounted && links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-3",
                        isActive && "bg-secondary"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            <Separator className="mb-4" />

            {/* Historial de Proyectos */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Proyectos Recientes
              </h3>
              <ScrollArea className="flex-1">
                <div className="space-y-1 pr-3">
                  {!mounted || ideas.length === 0 ? (
                    <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                      No hay proyectos aún
                    </p>
                  ) : (
                    Array.isArray(ideas) && ideas.map((idea) => {
                      const isActive =
                        pathname.includes(`/ideation/${idea.ID}`) ||
                        pathname.includes(`action-plan`) && pathname.includes(idea.ID);

                      return (
                        <ContextMenu key={idea.ID}>
                          <ContextMenuTrigger>
                            <Button
                              onClick={() => handleProjectClick(idea)}
                              variant={isActive ? "secondary" : "ghost"}
                              className={cn(
                                "w-full justify-start gap-2 h-auto py-2",
                                isActive && "bg-secondary"
                              )}
                            >
                              <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                              <div className="flex-1 text-left overflow-hidden">
                                <p className="text-xs font-medium truncate">
                                  {idea.Title}
                                </p>
                              </div>
                              {idea.Completed && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />
                              )}
                            </Button>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => handleDeleteClick(idea.ID, e as any)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar proyecto
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t p-4 space-y-3">
            {/* User Info */}
            {user && (
              <div className="flex items-center gap-2 px-2 py-2 rounded-md bg-muted/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{user.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <Button
              onClick={logout}
              variant="ghost"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              size="sm"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>

            <Separator />

            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tema</span>
              <ModeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Modal de confirmación de eliminación */}
      <AlertDialog open={!!ideaToDelete} onOpenChange={(open) => !open && cancelDelete()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El proyecto y todos sus mensajes asociados serán eliminados permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDelete}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
