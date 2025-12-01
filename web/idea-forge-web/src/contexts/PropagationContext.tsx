"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

// Tipo para el texto resaltado con su generación
type HighlightedItem = {
  text: string;
  generation: number; // 0 = verde (más reciente), 1 = amarillo, 2+ = normal
};

// Tipo para las secciones de cada módulo
type ModuleHighlights = {
  [sectionKey: string]: HighlightedItem[];
};

// Estado global de propagación
type PropagationState = {
  // Módulos que tienen actualizaciones (para mostrar punto rojo)
  modulesWithUpdates: number[];
  // Texto resaltado por módulo y sección
  highlights: {
    ideation: ModuleHighlights;
    action_plan: ModuleHighlights;
    architecture: ModuleHighlights;
  };
  // Generación actual (incrementa con cada cambio)
  currentGeneration: number;
};

type PropagationContextType = {
  state: PropagationState;
  // Agregar módulo a la lista de actualizados
  addModuleUpdate: (moduleId: number) => void;
  // Quitar módulo de la lista (cuando el usuario lo visita)
  clearModuleUpdate: (moduleId: number) => void;
  // Agregar texto resaltado a una sección
  addHighlight: (module: "ideation" | "action_plan" | "architecture", section: string, texts: string[]) => void;
  // Obtener el color para un texto según su generación
  getHighlightColor: (module: "ideation" | "action_plan" | "architecture", section: string, text: string) => "green" | "yellow" | "none";
  // Incrementar generación (cuando llega un nuevo cambio)
  incrementGeneration: () => void;
  // Limpiar todo
  clearAll: () => void;
};

const initialState: PropagationState = {
  modulesWithUpdates: [],
  highlights: {
    ideation: {},
    action_plan: {},
    architecture: {},
  },
  currentGeneration: 0,
};

const PropagationContext = createContext<PropagationContextType | null>(null);

export function PropagationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PropagationState>(initialState);

  const addModuleUpdate = useCallback((moduleId: number) => {
    setState((prev) => ({
      ...prev,
      modulesWithUpdates: prev.modulesWithUpdates.includes(moduleId)
        ? prev.modulesWithUpdates
        : [...prev.modulesWithUpdates, moduleId],
    }));
  }, []);

  const clearModuleUpdate = useCallback((moduleId: number) => {
    setState((prev) => ({
      ...prev,
      modulesWithUpdates: prev.modulesWithUpdates.filter((id) => id !== moduleId),
    }));
  }, []);

  const addHighlight = useCallback(
    (module: "ideation" | "action_plan" | "architecture", section: string, texts: string[]) => {
      setState((prev) => {
        const newGeneration = prev.currentGeneration + 1;
        const newItems: HighlightedItem[] = texts.map((text) => ({
          text,
          generation: newGeneration,
        }));

        // Actualizar generaciones anteriores (restar 1 a todas)
        const updatedHighlights = { ...prev.highlights };

        // Actualizar la sección específica
        const existingItems = updatedHighlights[module][section] || [];
        const updatedItems = existingItems.map((item) => ({
          ...item,
          generation: item.generation, // Mantener generación original
        }));

        updatedHighlights[module] = {
          ...updatedHighlights[module],
          [section]: [...updatedItems, ...newItems],
        };

        return {
          ...prev,
          highlights: updatedHighlights,
          currentGeneration: newGeneration,
        };
      });
    },
    []
  );

  const getHighlightColor = useCallback(
    (module: "ideation" | "action_plan" | "architecture", section: string, text: string): "green" | "yellow" | "none" => {
      const items = state.highlights[module][section] || [];
      const item = items.find((i) => text.includes(i.text) || i.text.includes(text));

      if (!item) return "none";

      const generationDiff = state.currentGeneration - item.generation;

      if (generationDiff === 0) return "green"; // Más reciente
      if (generationDiff === 1) return "yellow"; // Penúltimo
      return "none"; // Más antiguo
    },
    [state.highlights, state.currentGeneration]
  );

  const incrementGeneration = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentGeneration: prev.currentGeneration + 1,
    }));
  }, []);

  const clearAll = useCallback(() => {
    setState(initialState);
  }, []);

  return (
    <PropagationContext.Provider
      value={{
        state,
        addModuleUpdate,
        clearModuleUpdate,
        addHighlight,
        getHighlightColor,
        incrementGeneration,
        clearAll,
      }}
    >
      {children}
    </PropagationContext.Provider>
  );
}

export function usePropagation() {
  const context = useContext(PropagationContext);
  if (!context) {
    throw new Error("usePropagation must be used within a PropagationProvider");
  }
  return context;
}

// Mapeo de módulos a sus IDs para el stepper
export const MODULE_IDS = {
  ideation: 1,
  action_plan: 2,
  architecture: 3,
} as const;
