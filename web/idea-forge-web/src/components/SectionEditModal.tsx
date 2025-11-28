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

type SectionEditModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sectionKey: "title" | "objective" | "problem" | "scope";
  sectionTitle: string;
  currentValue: string;
  idea: {
    id: string;
    title: string;
    objective: string;
    problem: string;
    scope: string;
  };
  onSave: (newValue: string) => void;
};

export default function SectionEditModal({
  open,
  onOpenChange,
  sectionKey,
  sectionTitle,
  currentValue,
  idea,
  onSave,
}: SectionEditModalProps) {
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
      const response = await api.post(
        `/ideation/ideas/${idea.id}/edit-section`,
        {
          section: sectionKey,
          message: userInput,
        }
      );

      const aiMessage: Message = {
        role: "assistant",
        content: response.data.reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Actualizar el valor de la sección
      if (response.data.updatedSection) {
        setUpdatedValue(response.data.updatedSection);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);

      // Mensajes de error más específicos
      if (error.response?.status === 429) {
        toast.error("Límite de peticiones excedido. Por favor espera un momento e intenta de nuevo.");
      } else if (error.response?.status === 503) {
        toast.error("La IA está temporalmente no disponible (límite de tasa). Por favor espera 1-2 minutos.");
      } else if (error.response?.status === 500) {
        toast.error("Error del servidor. Por favor intenta nuevamente.");
      } else if (error.response?.status === 401) {
        toast.error("Sesión expirada. Por favor inicia sesión nuevamente.");
      } else if (error.response?.status === 422) {
        toast.error("Error de validación: " + (error.response?.data || "datos inválidos"));
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
    toast.success("Sección actualizada exitosamente");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Editando: {sectionTitle}
          </DialogTitle>
          <DialogDescription>
            Habla con la IA para refinar esta sección. Los cambios se aplican automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Panel Izquierdo: Contenido Actual */}
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-medium">Contenido actual:</p>
            <ScrollArea className="flex-1 rounded-lg border bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {updatedValue}
              </p>
            </ScrollArea>
          </div>

          {/* Panel Derecho: Chat con IA */}
          <div className="flex flex-col space-y-2 overflow-hidden">
            <p className="text-sm font-medium">Chat con la IA:</p>

            <ScrollArea className="flex-1 rounded-lg border p-4">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Cuéntale a la IA qué cambios quieres hacer</p>
                  <p className="text-xs mt-1">
                    Ejemplo: &quot;Quiero enfocarme más en estudiantes de diseño&quot;
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
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

            {/* Input */}
            <div className="flex gap-2">
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Aplicar Cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
