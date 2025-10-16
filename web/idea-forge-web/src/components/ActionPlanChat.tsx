"use client";

import { getActionPlanMessages, postActionPlanChat, updateActionPlan } from "@/lib/api";
import AIChat from "@/components/modules/AIChat";

export default function ActionPlanChat({
  actionPlanId,
  onPlanUpdate,
  isCompleted = false,
}: {
  actionPlanId: string;
  onPlanUpdate?: () => void;
  isCompleted?: boolean;
}) {
  // Adapters para normalizar la API del backend
  const fetchMessages = async (id: string) => {
    const messages = await getActionPlanMessages(id);
    // Los mensajes del action plan ya vienen en camelCase
    return messages;
  };

  const sendMessage = async (id: string, content: string) => {
    await postActionPlanChat(id, content);
  };

  const updateCompletion = async (id: string, completed: boolean) => {
    await updateActionPlan(id, { completed, status: "completed" });
  };

  return (
    <AIChat
      entityId={actionPlanId}
      agentName="Analista de Sistemas"
      agentDescription="Especializado en levantar requerimientos y diseñar arquitecturas"
      isCompleted={isCompleted}
      fetchMessages={fetchMessages}
      sendMessage={sendMessage}
      updateCompletion={updateCompletion}
      onUpdate={onPlanUpdate}
      placeholder="Pregunta sobre requerimientos, arquitectura o flujos de negocio..."
      emptyStateText="No hay mensajes aún"
      completedText="¡Plan de Acción completado!"
      completedDescription="Tu plan está listo para pasar al siguiente módulo"
      completeButtonLabel="Finalizar Plan"
      completionModal={{
        title: "¡Plan de Acción Completado! 🎉",
        description: "Tu plan de acción técnico está listo con todos los requerimientos definidos. El siguiente módulo estará disponible próximamente.",
        closeLabel: "Entendido",
      }}
    />
  );
}
