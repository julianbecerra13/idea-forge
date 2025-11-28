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
import { api } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type SectionKey =
  | "user_stories"
  | "database_type"
  | "database_schema"
  | "entities_relationships"
  | "tech_stack"
  | "architecture_pattern"
  | "system_architecture";

type ArchitectureSectionModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionKey: SectionKey;
  sectionTitle: string;
  currentValue: string;
  architectureId: string;
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
  architectureContext: {
    user_stories: string;
    database_type: string;
    database_schema: string;
    entities_relationships: string;
    tech_stack: string;
    architecture_pattern: string;
    system_architecture: string;
  };
  onSave: (newValue: string) => void;
  isCompleted?: boolean;
};

export default function ArchitectureSectionModal({
  open,
  onOpenChange,
  sectionKey,
  sectionTitle,
  currentValue,
  architectureId,
  ideaContext,
  planContext,
  architectureContext,
  onSave,
  isCompleted = false,
}: ArchitectureSectionModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [updatedValue, setUpdatedValue] = useState(currentValue);

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
      const response = await api.post(`/architecture/${architectureId}/edit-section`, {
        section: sectionKey,
        message: userInput,
        idea_context: ideaContext,
        plan_context: planContext,
        architecture_context: architectureContext,
      });

      const aiMessage: Message = {
        role: "assistant",
        content: response.data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (response.data.updatedSection) {
        setUpdatedValue(response.data.updatedSection);
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
      case "user_stories":
        return 'Ejemplo: "Agrega historias de usuario para el módulo de pagos"';
      case "database_type":
        return 'Ejemplo: "Quiero usar MongoDB en lugar de PostgreSQL"';
      case "database_schema":
        return 'Ejemplo: "Agrega una tabla para auditoría de cambios"';
      case "entities_relationships":
        return 'Ejemplo: "Agrega la entidad de Notificaciones"';
      case "tech_stack":
        return 'Ejemplo: "Cambia React por Vue.js en el frontend"';
      case "architecture_pattern":
        return 'Ejemplo: "Prefiero usar microservicios"';
      case "system_architecture":
        return 'Ejemplo: "Agrega un sistema de colas para procesamiento asíncrono"';
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
            Habla con el Arquitecto de Software para refinar esta sección. Tiene contexto completo del proyecto.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 h-[400px]">
          {/* Panel Izquierdo: Contenido Actual */}
          <div className="flex flex-col space-y-2 h-full overflow-hidden">
            <p className="text-sm font-medium flex-shrink-0">Contenido actual:</p>
            <ScrollArea className="flex-1 rounded-lg border bg-muted/50 p-4">
              <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                {updatedValue || "Sin contenido. Usa el chat para generar."}
              </pre>
            </ScrollArea>
          </div>

          {/* Panel Derecho: Chat con IA */}
          <div className="flex flex-col space-y-2 h-full overflow-hidden">
            <p className="text-sm font-medium flex-shrink-0">Chat con Arquitecto de Software:</p>

            <ScrollArea className="flex-1 rounded-lg border p-4 min-h-0">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Cuéntale al arquitecto qué cambios quieres hacer</p>
                  <p className="text-xs mt-1">{getPlaceholderExample()}</p>
                  {ideaContext && (
                    <div className="mt-4 p-3 bg-muted rounded-lg text-left">
                      <p className="text-xs font-medium mb-1">Contexto del proyecto:</p>
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
                disabled={loading || isCompleted}
              />
              <Button
                onClick={handleSendMessage}
                disabled={loading || !userInput.trim() || isCompleted}
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isCompleted}>
            Aplicar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
