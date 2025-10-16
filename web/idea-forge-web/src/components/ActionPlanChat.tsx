"use client";

import { useEffect, useState, useRef } from "react";
import { getActionPlanMessages, postActionPlanChat, updateActionPlan } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, Loader2, Bot, User, CheckCircle2, Flag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import CompletionModal from "@/components/CompletionModal";

type Message = {
  id: string;
  action_plan_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export default function ActionPlanChat({
  actionPlanId,
  onPlanUpdate,
  isCompleted = false,
}: {
  actionPlanId: string;
  onPlanUpdate?: () => void;
  isCompleted?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showCompletedModal, setShowCompletedModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCompletedRef = useRef(isCompleted);

  async function load() {
    try {
      const list: Message[] = await getActionPlanMessages(actionPlanId);
      setMessages(list || []);
    } catch (error) {
      toast.error("Error al cargar mensajes");
      console.error(error);
      setMessages([]);
    } finally {
      setInitialLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [actionPlanId]);

  useEffect(() => {
    // Auto-scroll al final cuando hay nuevos mensajes
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Mostrar modal cuando se completa
  useEffect(() => {
    if (isCompleted && !prevCompletedRef.current) {
      setShowCompletedModal(true);
    }
    prevCompletedRef.current = isCompleted;
  }, [isCompleted]);

  async function send() {
    if (!text.trim() || loading || isCompleted) return;

    const userMessage = text.trim();

    // Validaciones
    if (userMessage.length === 0) {
      toast.error("El mensaje no puede estar vacío");
      return;
    }

    if (userMessage.length > 10000) {
      toast.error("El mensaje es muy largo. Máximo 10,000 caracteres.");
      return;
    }

    setText("");
    setLoading(true);

    try {
      const optimistic: Message = {
        id: crypto.randomUUID(),
        action_plan_id: actionPlanId,
        role: "user",
        content: userMessage,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      await postActionPlanChat(actionPlanId, userMessage);
      await load();

      if (onPlanUpdate) {
        onPlanUpdate();
      }
    } catch (error: any) {
      const errorMsg = error.response?.data || error.message || "Error al enviar mensaje";
      toast.error(errorMsg);

      // Revertir optimistic update
      setMessages((prev) =>
        prev.filter(m => !(m.content === userMessage && m.role === "user"))
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isCompleted) {
      e.preventDefault();
      send();
    }
  };

  async function handleManualComplete() {
    try {
      setLoading(true);
      await updateActionPlan(actionPlanId, { completed: true, status: "completed" });
      toast.success("¡Plan de Acción marcado como completado!");
      if (onPlanUpdate) {
        onPlanUpdate();
      }
    } catch (error) {
      toast.error("Error al finalizar el plan");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <Card className="flex h-full flex-col">
      <CardHeader className="border-b shrink-0">
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquare className="h-5 w-5 text-primary" />
          Analista de Sistemas
          {isCompleted && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Especializado en levantar requerimientos y diseñar arquitecturas
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0 min-h-0">
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {initialLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !messages || messages.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-sm text-muted-foreground">
                <Bot className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p>No hay mensajes aún</p>
                <p className="mt-1">El agente te ayudará a crear el plan de acción</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "flex gap-3",
                    m.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {m.role !== "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-4 py-2.5 text-sm",
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : m.role === "assistant"
                        ? "bg-muted"
                        : "border bg-card text-muted-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <p className="mt-1 text-xs opacity-70">
                      {new Date(m.created_at).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {m.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <User className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2.5">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Analizando...
                    </span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          )}
        </div>

        <div className="border-t p-4 shrink-0">
          {isCompleted ? (
            <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
              <div className="text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ¡Plan de Acción completado!
                </p>
                <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                  Tu plan está listo para pasar al siguiente módulo
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Pregunta sobre requerimientos, arquitectura o flujos de negocio..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  rows={2}
                  className="resize-none"
                />
                <Button
                  onClick={send}
                  disabled={loading || !text.trim()}
                  size="icon"
                  className="h-auto"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Presiona Enter para enviar, Shift+Enter para nueva línea
                </p>
                <Button
                  onClick={handleManualComplete}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Flag className="h-3.5 w-3.5" />
                  Finalizar Plan
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Modal celebratorio */}
    <CompletionModal
      open={showCompletedModal}
      onOpenChange={setShowCompletedModal}
      title="¡Plan de Acción Completado! 🎉"
      description="Tu plan de acción técnico está listo con todos los requerimientos definidos. El siguiente módulo estará disponible próximamente."
      closeLabel="Entendido"
    />
    </>
  );
}
