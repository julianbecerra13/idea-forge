"use client";

import AIChat, { Message } from "@/components/modules/AIChat";
import {
  getArchitectureMessages,
  postArchitectureChat,
  updateArchitecture,
} from "@/lib/api";

type Props = {
  architectureId: string;
  onMessageSent?: () => void;
  isCompleted?: boolean;
};

export default function ArchitectureChat({
  architectureId,
  onMessageSent,
  isCompleted = false,
}: Props) {
  const fetchMessages = async (id: string): Promise<Message[]> => {
    const messages: Array<{
      id: string;
      role: string;
      content: string;
      created_at: string;
    }> = await getArchitectureMessages(id);

    return messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    }));
  };

  const sendMessage = async (id: string, message: string) => {
    const response = await postArchitectureChat(id, message);
    return response.response;
  };

  const handleMarkComplete = async (id: string) => {
    await updateArchitecture(id, { completed: true });
  };

  return (
    <AIChat
      entityId={architectureId}
      agentName="Arquitecto de Software"
      agentDescription="Especialista en diseño de sistemas, bases de datos y patrones arquitectónicos"
      isCompleted={isCompleted}
      fetchMessages={fetchMessages}
      sendMessage={sendMessage}
      updateCompletion={handleMarkComplete}
      onUpdate={onMessageSent}
      placeholder="Pregunta sobre arquitectura, bases de datos, tecnologías..."
      completionModal={{
        title: "¡Arquitectura Completada! 🏗️",
        description:
          "Has finalizado el diseño arquitectónico de tu proyecto. Ya tienes definida la estructura técnica completa.",
        actionButton: {
          label: "Ir al Siguiente Módulo",
          onClick: async () => {
            // Por ahora solo cerramos el modal
            // En el futuro: navegar al módulo 4 (implementación)
          },
        },
      }}
    />
  );
}
