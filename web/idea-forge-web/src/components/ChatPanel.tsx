"use client";

import { useEffect, useState, useRef } from "react";
import { getMessages, postChat, updateIdea } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MessageSquare, Send, Loader2, Bot, User, CheckCircle2, Flag } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Message = {
  ID: string;
  IdeaID: string;
  Role: "user" | "assistant" | "system";
  Content: string;
  CreatedAt: string;
};

export default function ChatPanel({
  ideaId,
  onMessageSent,
  isCompleted = false,
}: {
  ideaId: string;
  onMessageSent?: () => void;
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
      const list: Message[] = await getMessages(ideaId);
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
  }, [ideaId]);

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

    const userMessage = text;
    setText("");
    setLoading(true);

    try {
      const optimistic: Message = {
        ID: crypto.randomUUID(),
        IdeaID: ideaId,
        Role: "user",
        Content: userMessage,
        CreatedAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);

      await postChat(ideaId, userMessage);
      await load();

      if (onMessageSent) {
        onMessageSent();
      }
    } catch (error) {
      toast.error("Error al enviar mensaje");
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
      await updateIdea(ideaId, { completed: true });
      toast.success("¡Idea marcada como completada!");
      if (onMessageSent) {
        onMessageSent(); // Recargar la idea para actualizar el estado
      }
    } catch (error) {
      toast.error("Error al finalizar la idea");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="flex h-full flex-col max-h-[calc(100vh-8rem)]">
        <CardHeader className="border-b shrink-0">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
            Agente de Ideación
            {isCompleted && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
          </CardTitle>
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
                  <p className="mt-1">Inicia la conversación con el agente</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.ID}
                    className={cn(
                      "flex gap-3",
                      m.Role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {m.Role !== "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2.5 text-sm",
                        m.Role === "user"
                          ? "bg-primary text-primary-foreground"
                          : m.Role === "assistant"
                          ? "bg-muted"
                          : "border bg-card text-muted-foreground"
                      )}
                    >
                      <p className="whitespace-pre-wrap">{m.Content}</p>
                      <p className="mt-1 text-xs opacity-70">
                        {new Date(m.CreatedAt).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    {m.Role === "user" && (
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
                        Escribiendo...
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
              <div className="rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-green-600" />
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ¡Idea completada!
                </p>
                <p className="mt-1 text-xs text-green-700 dark:text-green-300">
                  Tu idea está lista para el siguiente paso
                </p>
              </div>
            ) : (
              <>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Escribe tu mensaje... (Shift+Enter para nueva línea)"
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
                    Finalizar Idea
                  </Button>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal celebratorio */}
      <Dialog open={showCompletedModal} onOpenChange={setShowCompletedModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <DialogTitle className="text-center text-2xl">
              ¡Idea Completada! 🎉
            </DialogTitle>
            <DialogDescription className="text-center">
              Tu idea ha sido estructurada exitosamente con toda la información necesaria.
              Los campos han sido mejorados y están listos para el siguiente módulo.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Button onClick={() => setShowCompletedModal(false)} size="lg">
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
