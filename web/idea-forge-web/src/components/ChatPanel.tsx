"use client";

import { getMessages, postChat, updateIdea, createActionPlan } from "@/lib/api";
import AIChat from "@/components/modules/AIChat";

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
  // Adapters para normalizar la API del backend
  const fetchMessages = async (id: string) => {
    const messages: Message[] = await getMessages(id);
    // Normalizar campos de Go (PascalCase) a formato estándar
    return messages.map(m => ({
      id: m.ID,
      role: m.Role,
      content: m.Content,
      created_at: m.CreatedAt,
    }));
  };

  const sendMessage = async (id: string, content: string) => {
    await postChat(id, content);
  };

  const updateCompletion = async (id: string, completed: boolean) => {
    await updateIdea(id, { completed });
  };

  return (
    <AIChat
      entityId={ideaId}
      agentName="Agente de Ideación"
      agentDescription="Especializado en estructurar ideas, analizar competencia y monetización"
      isCompleted={isCompleted}
      fetchMessages={fetchMessages}
      sendMessage={sendMessage}
      updateCompletion={updateCompletion}
      onUpdate={onMessageSent}
      placeholder="Pregunta sobre tu idea, competencia o monetización..."
      emptyStateText="No hay mensajes aún"
      completedText="¡Idea Completada!"
      completedDescription="Tu idea ha sido estructurada exitosamente"
      completeButtonLabel="Marcar como Completado"
      completionModal={{
        title: "¡Idea Completada! 🎉",
        description: "Tu idea ha sido estructurada exitosamente. Ahora puedes crear un plan de acción técnico detallado.",
        actionButton: {
          label: "Ir a Plan de Acción",
          onClick: async () => {
            const plan = await createActionPlan(ideaId);
            window.location.href = `/action-plan/${plan.id}`;
          },
        },
        closeLabel: "Quedarse Aquí",
      }}
    />
  );
}
