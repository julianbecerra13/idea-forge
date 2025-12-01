"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { api, propagateToIdeation, updateActionPlan } from "@/lib/api";
import { usePropagation, MODULE_IDS } from "@/contexts/PropagationContext";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type ActionPlanSectionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionKey: "functional_requirements" | "non_functional_requirements" | "business_logic_flow";
  sectionTitle: string;
  currentValue: string;
  planId: string;
  ideaId: string;
  ideaContext?: {
    title: string;
    objective: string;
    problem: string;
    scope: string;
  };
  planContext: {
    functional_requirements: string;
    non_functional_requirements: string;
    business_logic_flow: string;
  };
  onSave: (newValue: string) => void;
  onPropagation?: () => void;
  isCompleted?: boolean;
};

export default function ActionPlanSectionModal({
  open,
  onOpenChange,
  sectionKey,
  sectionTitle,
  currentValue,
  planId,
  ideaId,
  ideaContext,
  planContext,
  onSave,
  onPropagation,
  isCompleted = false,
}: ActionPlanSectionModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatedValue, setUpdatedValue] = useState(currentValue);

  const { addModuleUpdate, addHighlight, incrementGeneration } = usePropagation();

  const handleSendMessage = async () => {
    if (!userInput.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: userInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setLoading(true);

    try {
      const response = await api.post(`/action-plan/${planId}/edit-section`, {
        section: sectionKey,
        message: userInput,
        idea_context: ideaContext,
        plan_context: planContext,
      });

      const aiMessage: Message = {
        role: "assistant",
        content: response.data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Actualizar el valor de la sección
      if (response.data.updatedSection) {
        setUpdatedValue(response.data.updatedSection);
        // Actualizar el componente padre inmediatamente
        onSave(response.data.updatedSection);
      }

      // Agregar resaltado para el texto nuevo en esta sección
      if (response.data.addedText && response.data.addedText.length > 0) {
        incrementGeneration();
        addHighlight("action_plan", sectionKey, response.data.addedText);
      }

      // Procesar propagaciones
      const propagation = response.data.propagation;
      if (propagation) {
        let propagatedModules: string[] = [];

        // Propagar a otras secciones del plan de acción
        if (propagation.action_plan) {
          for (const [section, data] of Object.entries(propagation.action_plan)) {
            if (section === sectionKey) continue; // No propagar a la misma sección
            const sectionData = data as { content: string | null; addedText: string[] };
            if (sectionData.content) {
              // Actualizar la sección
              await updateActionPlan(planId, { [section]: sectionData.content });

              // Agregar highlights
              if (sectionData.addedText && sectionData.addedText.length > 0) {
                addHighlight("action_plan", section, sectionData.addedText);
              }
            }
          }
        }

        // Propagar a ideación
        if (propagation.ideation && ideaId) {
          const ideaUpdates: Record<string, string> = {};

          for (const [section, data] of Object.entries(propagation.ideation)) {
            const sectionData = data as { content: string | null; addedText: string[] };
            if (sectionData.content) {
              ideaUpdates[section] = sectionData.content;

              // Agregar highlights
              if (sectionData.addedText && sectionData.addedText.length > 0) {
                addHighlight("ideation", section, sectionData.addedText);
              }
            }
          }

          if (Object.keys(ideaUpdates).length > 0) {
            await propagateToIdeation(ideaId, {
              ...ideaUpdates,
              source: "action_plan",
            } as any);
            addModuleUpdate(MODULE_IDS.ideation);
            propagatedModules.push("Ideación");
          }
        }

        // Mostrar notificación de propagación
        if (propagatedModules.length > 0) {
          toast.success(
            `Cambios propagados a: ${propagatedModules.join(", ")}`,
            { duration: 5000 }
          );
          onPropagation?.();
        }
      }
    } catch (error: any) {
      console.error("Error sending message:", error);

      if (error.response?.status === 429) {
        toast.error("Límite de peticiones excedido. Por favor espera un momento.");
      } else if (error.response?.status === 503) {
        toast.error("La IA está temporalmente no disponible. Espera 1-2 minutos.");
      } else if (error.response?.status === 500) {
        toast.error("Error del servidor. Por favor intenta nuevamente.");
      } else if (error.response?.status === 401) {
        toast.error("Sesión expirada. Por favor inicia sesión nuevamente.");
      } else {
        toast.error("Error al comunicarse con la IA");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSave(updatedValue);
    onOpenChange(false);
  };

  const getPlaceholderExample = () => {
    switch (sectionKey) {
      case "functional_requirements":
        return 'Ejemplo: "Agrega un requerimiento para notificaciones push"';
      case "non_functional_requirements":
        return 'Ejemplo: "Necesito que soporte 50,000 usuarios concurrentes"';
      case "business_logic_flow":
        return 'Ejemplo: "Agrega el flujo de recuperación de contraseña"';
      default:
        return "Describe qué cambios quieres hacer...";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Editando: {sectionTitle}
          </DialogTitle>
          <DialogDescription>
            Habla con la IA para refinar esta sección. La IA tiene contexto de tu idea y todo el plan.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 h-[400px]">
          {/* Panel Izquierdo: Contenido Actual */}
          <div className="flex flex-col space-y-2 h-full overflow-hidden">
            <p className="text-sm font-medium flex-shrink-0">Contenido actual:</p>
            <ScrollArea className="flex-1 rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {updatedValue || "Sin contenido. Usa el chat para generar."}
              </p>
            </ScrollArea>
          </div>

          {/* Panel Derecho: Chat con IA */}
          <div className="flex flex-col space-y-2 h-full overflow-hidden">
            <p className="text-sm font-medium flex-shrink-0">Chat con la IA:</p>

            <ScrollArea className="flex-1 rounded-lg border p-4 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Cuéntale a la IA qué cambios quieres hacer</p>
                  <p className="text-xs mt-1">{getPlaceholderExample()}</p>
                  {ideaContext && (
                    <div className="mt-4 p-3 bg-muted rounded-lg text-left">
                      <p className="text-xs font-medium mb-1">Contexto de la idea:</p>
                      <p className="text-xs">&quot;{ideaContext.title}&quot;</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg px-4 py-2 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {msg.timestamp.toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Input - siempre visible */}
            <div className="flex gap-2 flex-shrink-0">
              <Input
                placeholder="Escribe tu mensaje..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={loading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading || !userInput.trim()}
                size="icon"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <p className="text-xs text-muted-foreground mr-auto">
            Los cambios se guardan automáticamente
          </p>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
