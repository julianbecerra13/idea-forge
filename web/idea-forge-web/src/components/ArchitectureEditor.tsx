"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2 } from "lucide-react";
import { updateArchitecture } from "@/lib/api";

type Architecture = {
  id: string;
  action_plan_id: string;
  status: string;
  user_stories: string;
  database_type: string;
  database_schema: string;
  entities_relationships: string;
  tech_stack: string;
  architecture_pattern: string;
  system_architecture: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

type Props = {
  architecture: Architecture;
  onUpdate?: () => void;
};

export default function ArchitectureEditor({ architecture, onUpdate }: Props) {
  const [formData, setFormData] = useState({
    user_stories: architecture.user_stories || "",
    database_type: architecture.database_type || "",
    database_schema: architecture.database_schema || "",
    entities_relationships: architecture.entities_relationships || "",
    tech_stack: architecture.tech_stack || "",
    architecture_pattern: architecture.architecture_pattern || "",
    system_architecture: architecture.system_architecture || "",
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFormData({
      user_stories: architecture.user_stories || "",
      database_type: architecture.database_type || "",
      database_schema: architecture.database_schema || "",
      entities_relationships: architecture.entities_relationships || "",
      tech_stack: architecture.tech_stack || "",
      architecture_pattern: architecture.architecture_pattern || "",
      system_architecture: architecture.system_architecture || "",
    });
  }, [architecture]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateArchitecture(architecture.id, formData);
      setHasChanges(false);
      onUpdate?.();
    } catch (error) {
      console.error("Error saving architecture:", error);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    {
      id: "user_stories",
      label: "Historias de Usuario",
      description:
        "Historias de usuario en formato: Como [rol], quiero [funcionalidad], para [beneficio]",
      placeholder: "US-001: Como usuario, quiero registrarme en la plataforma, para acceder a las funcionalidades...",
      rows: 6,
    },
    {
      id: "database_type",
      label: "Tipo de Base de Datos",
      description: "Tipo de base de datos recomendado (Relacional, NoSQL, Híbrida) con justificación",
      placeholder: "Relacional (PostgreSQL): Requiere transacciones ACID y relaciones complejas...",
      rows: 4,
    },
    {
      id: "database_schema",
      label: "Esquema de Base de Datos",
      description: "Esquema completo de la base de datos (SQL DDL, JSON schema, etc)",
      placeholder: "CREATE TABLE users (\n  id UUID PRIMARY KEY,\n  email VARCHAR(255) UNIQUE NOT NULL,\n  ...\n);",
      rows: 8,
    },
    {
      id: "entities_relationships",
      label: "Entidades y Relaciones",
      description: "Descripción de entidades principales y sus relaciones",
      placeholder: "Usuario (1:N) Proyectos\nProyecto (N:M) Tecnologías\n...",
      rows: 6,
    },
    {
      id: "tech_stack",
      label: "Stack Tecnológico",
      description: "Stack completo: Frontend, Backend, Base de Datos, Infraestructura",
      placeholder: "Frontend:\n- React 18 con Next.js 14\n- TailwindCSS para estilos\n\nBackend:\n- Node.js con Express\n...",
      rows: 8,
    },
    {
      id: "architecture_pattern",
      label: "Patrón de Arquitectura",
      description: "Patrón arquitectónico recomendado con justificación",
      placeholder: "Clean Architecture: Permite separación de responsabilidades y facilita el testing...",
      rows: 5,
    },
    {
      id: "system_architecture",
      label: "Arquitectura del Sistema",
      description: "Arquitectura completa: Capas, componentes, flujo de datos, seguridad, escalabilidad",
      placeholder: "CAPAS:\n1. Presentación (React)\n2. Lógica de Negocio (API)\n3. Datos (PostgreSQL)\n\nFLUJO:\n...",
      rows: 10,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header con botón de guardar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Arquitectura del Sistema</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Edita y refina la arquitectura técnica de tu proyecto
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        )}
      </div>

      {/* Status Badge */}
      <div className="flex gap-2">
        <Badge variant={architecture.completed ? "default" : "secondary"}>
          {architecture.completed ? "Completado" : "En Progreso"}
        </Badge>
        <Badge variant="outline">{architecture.status}</Badge>
      </div>

      {/* Campos editables */}
      <div className="grid gap-6">
        {fields.map((field) => (
          <Card key={field.id} className="p-6">
            <div className="space-y-3">
              <div>
                <Label htmlFor={field.id} className="text-base font-semibold">
                  {field.label}
                </Label>
                <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
              </div>
              <Textarea
                id={field.id}
                value={formData[field.id as keyof typeof formData]}
                onChange={(e) => handleChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                rows={field.rows}
                className="font-mono text-sm resize-none"
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Botón de guardar al final también */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
