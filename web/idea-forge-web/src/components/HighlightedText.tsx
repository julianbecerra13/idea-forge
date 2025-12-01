"use client";

import React from "react";
import { usePropagation } from "@/contexts/PropagationContext";

type HighlightedTextProps = {
  text: string;
  module: "ideation" | "action_plan" | "architecture";
  section: string;
  className?: string;
};

export default function HighlightedText({ text, module, section, className = "" }: HighlightedTextProps) {
  const { state, getHighlightColor } = usePropagation();

  // Obtener los items resaltados para esta sección
  const highlightedItems = state.highlights[module][section] || [];

  if (highlightedItems.length === 0) {
    // Sin resaltados, devolver texto normal
    return <span className={className}>{text}</span>;
  }

  // Crear fragmentos con sus colores
  const fragments: { text: string; color: "green" | "yellow" | "none" }[] = [];
  let remainingText = text;

  // Ordenar items por longitud (más largos primero para mejor matching)
  const sortedItems = [...highlightedItems].sort((a, b) => b.text.length - a.text.length);

  // Función para encontrar y marcar fragmentos
  const processText = (textToProcess: string): { text: string; color: "green" | "yellow" | "none" }[] => {
    const result: { text: string; color: "green" | "yellow" | "none" }[] = [];
    let currentIndex = 0;

    while (currentIndex < textToProcess.length) {
      let foundMatch = false;

      for (const item of sortedItems) {
        const matchIndex = textToProcess.indexOf(item.text, currentIndex);

        if (matchIndex === currentIndex) {
          // Encontramos un match al inicio
          const color = getHighlightColor(module, section, item.text);
          result.push({ text: item.text, color });
          currentIndex += item.text.length;
          foundMatch = true;
          break;
        }
      }

      if (!foundMatch) {
        // No hay match, buscar el próximo match
        let nextMatchIndex = textToProcess.length;

        for (const item of sortedItems) {
          const idx = textToProcess.indexOf(item.text, currentIndex);
          if (idx !== -1 && idx < nextMatchIndex) {
            nextMatchIndex = idx;
          }
        }

        // Agregar texto sin resaltar hasta el próximo match
        result.push({
          text: textToProcess.substring(currentIndex, nextMatchIndex),
          color: "none",
        });
        currentIndex = nextMatchIndex;
      }
    }

    return result;
  };

  const processedFragments = processText(text);

  return (
    <span className={className}>
      {processedFragments.map((fragment, index) => {
        if (fragment.color === "none") {
          return <span key={index}>{fragment.text}</span>;
        }

        const colorClass =
          fragment.color === "green"
            ? "text-green-500 font-medium"
            : "text-yellow-500 font-medium";

        return (
          <span key={index} className={colorClass}>
            {fragment.text}
          </span>
        );
      })}
    </span>
  );
}
