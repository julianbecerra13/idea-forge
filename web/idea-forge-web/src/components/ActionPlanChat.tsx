"use client";

import { useRouter } from "next/navigation";
import { getActionPlanMessages, postActionPlanChat, updateActionPlan, createArchitecture } from "@/lib/api";
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
  const router = useRouter();

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

  const handleGoToArchitecture = async () => {
    try {
      // Crear arquitectura basada en este action plan
      const architecture = await createArchitecture(actionPlanId);
      // Navegar a la arquitectura
      router.push(`/architecture/${architecture.id}`);
    } catch (error) {
      console.error("Error creating architecture:", error);
    }
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
        description: "Tu plan de acción técnico está listo con todos los requerimientos definidos. Es hora de diseñar la arquitectura del sistema.",
        closeLabel: "Cerrar",
        actionButton: {
          label: "Ir a Arquitectura",
          onClick: handleGoToArchitecture,
        },
      }}
    />
  );
}
