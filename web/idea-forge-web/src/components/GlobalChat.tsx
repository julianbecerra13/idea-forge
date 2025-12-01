"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, Sparkles, Globe } from "lucide-react";
import { toast } from "sonner";
import { getGlobalChatMessages, postGlobalChat } from "@/lib/api";

type Message = {
  id: string;
  idea_id: string;
  role: "user" | "assistant";
  content: string;
  affected_modules?: string;
  created_at: string;
};

type GlobalChatProps = {
  ideaId: string;
  onUpdate?: () => void;
};

export default function GlobalChat({ ideaId, onUpdate }: GlobalChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const data = await getGlobalChatMessages(ideaId);
        setMessages(data || []);
      } catch (error) {
        console.error("Error loading messages:", error);
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, [ideaId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!userInput.trim() || loading) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      idea_id: ideaId,
      role: "user",
      content: userInput,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput("");
    setLoading(true);

    try {
      const response = await postGlobalChat(ideaId, userInput);

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        idea_id: ideaId,
        role: "assistant",
        content: response.reply,
        affected_modules: JSON.stringify(response.affected_modules || []),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Show notification about affected modules
      if (response.affected_modules && response.affected_modules.length > 0) {
        toast.success(
          `Cambios aplicados en: ${response.affected_modules.join(", ")}`,
          { duration: 5000 }
        );
      }

      // Trigger refresh of parent data
      if (response.affected_modules?.length > 0 || response.new_modules?.length > 0) {
        onUpdate?.();
      }
    } catch (error: any) {
      console.error("Error sending message:", error);

      if (error.response?.status === 429) {
        toast.error("Límite de peticiones excedido. Espera un momento.");
      } else if (error.response?.status === 503) {
        toast.error("La IA está temporalmente no disponible. Espera 1-2 minutos.");
      } else {
        toast.error("Error al comunicarse con la IA");
      }

      // Remove temporary user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  };

  const parseAffectedModules = (affected?: string): string[] => {
    if (!affected) return [];
    try {
      return JSON.parse(affected);
    } catch {
      return [];
    }
  };

  if (loadingMessages) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">Chat Global del Proyecto</p>
            <p className="text-xs mt-2 max-w-[250px] mx-auto">
              Desde aquí puedes hacer cambios que afecten a todos los módulos del proyecto.
            </p>
            <p className="text-xs mt-2 text-primary">
              Ejemplo: &quot;Agregar sistema de marketing&quot;
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const affected = parseAffectedModules(msg.affected_modules);
              return (
                <div
                  key={msg.id}
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
                    {affected.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {affected.map((mod) => (
                          <Badge key={mod} variant="secondary" className="text-xs">
                            {mod}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs opacity-70 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
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

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Escribe cambios globales..."
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
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Los cambios se propagan automáticamente a todos los módulos
        </p>
      </div>
    </div>
  );
}
