"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Package, ChevronRight, ChevronLeft, X } from "lucide-react";
import GlobalChat from "@/components/GlobalChat";
import DevelopmentModulesList from "@/components/DevelopmentModulesList";

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

type GlobalSidePanelProps = {
  ideaId: string;
  architectureId?: string;
  modules?: DevelopmentModule[];
  onModulesChange?: () => void;
  autoOpen?: boolean;
};

export default function GlobalSidePanel({
  ideaId,
  architectureId,
  modules = [],
  onModulesChange,
  autoOpen = false,
}: GlobalSidePanelProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [activeTab, setActiveTab] = useState<"chat" | "modules">("chat");

  // Auto-open when entering architecture and there are modules
  useEffect(() => {
    if (autoOpen && modules.length > 0) {
      setIsOpen(true);
      setActiveTab("modules");
    }
  }, [autoOpen, modules.length]);

  if (!isOpen) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50">
        <Button
          variant="default"
          size="sm"
          className="rounded-l-lg rounded-r-none shadow-lg"
          onClick={() => setIsOpen(true)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          <MessageSquare className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-background border-l shadow-xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "chat" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("chat")}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            Chat Global
          </Button>
          {architectureId && (
            <Button
              variant={activeTab === "modules" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("modules")}
              className="relative"
            >
              <Package className="h-4 w-4 mr-1" />
              Módulos
              {modules.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {modules.length}
                </span>
              )}
            </Button>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" ? (
          <GlobalChat ideaId={ideaId} onUpdate={onModulesChange} />
        ) : (
          <DevelopmentModulesList
            modules={modules}
            onModuleClick={(module) => console.log("Module clicked:", module)}
          />
        )}
      </div>
    </div>
  );
}
