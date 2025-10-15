"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lightbulb, Home, Plus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModeToggle } from "@/components/mode-toggle";
import { useEffect, useState } from "react";
import { listIdeas } from "@/lib/api";

type Idea = {
  ID: string;
  Title: string;
  Completed: boolean;
  CreatedAt: string;
};

export function Sidebar() {
  const pathname = usePathname();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadIdeas();
  }, []);

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

  const links = [
    { href: "/", label: "Inicio", icon: Home },
    { href: "/ideation", label: "Nueva Idea", icon: Plus },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 hidden w-60 flex-col border-r bg-card lg:flex">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <Lightbulb className="h-6 w-6 text-primary" />
          <span className="text-xl font-bold">Idea Forge</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-hidden p-4 flex flex-col">
          <div className="space-y-1 mb-4">
            {links.map((link) => {
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
                {ideas.length === 0 ? (
                  <p className="px-2 py-4 text-xs text-muted-foreground text-center">
                    No hay proyectos aún
                  </p>
                ) : (
                  ideas.map((idea) => {
                    const isActive = pathname === `/ideation/${idea.ID}`;
                    return (
                      <Link key={idea.ID} href={`/ideation/${idea.ID}`}>
                        <Button
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
                      </Link>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tema</span>
            <ModeToggle />
          </div>
        </div>
      </div>
    </aside>
  );
}
