"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { updateActionPlan } from "@/lib/api";
import { toast } from "sonner";
import { Save, CheckCircle2, FileCode, Shield, GitBranch } from "lucide-react";

type ActionPlan = {
  id: string;
  idea_id: string;
  status: string;
  functional_requirements: string;
  non_functional_requirements: string;
  business_logic_flow: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export default function ActionPlanEditor({
  plan,
  onUpdate,
}: {
  plan: ActionPlan;
  onUpdate: () => void;
}) {
  const [functionalReq, setFunctionalReq] = useState(plan.functional_requirements || "");
  const [nonFunctionalReq, setNonFunctionalReq] = useState(plan.non_functional_requirements || "");
  const [businessFlow, setBusinessFlow] = useState(plan.business_logic_flow || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateActionPlan(plan.id, {
        functional_requirements: functionalReq,
        non_functional_requirements: nonFunctionalReq,
        business_logic_flow: businessFlow,
      });
      toast.success("Plan de acción guardado exitosamente");
      onUpdate();
    } catch (error) {
      toast.error("Error al guardar el plan de acción");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      setSaving(true);
      await updateActionPlan(plan.id, {
        completed: true,
        status: "completed",
      });
      toast.success("¡Plan de acción completado!");
      onUpdate();
    } catch (error) {
      toast.error("Error al completar el plan");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const hasUnsavedChanges =
    functionalReq !== (plan.functional_requirements || "") ||
    nonFunctionalReq !== (plan.non_functional_requirements || "") ||
    businessFlow !== (plan.business_logic_flow || "");

  return (
    <div className="space-y-6">
      {/* Botones de Acción */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {plan.completed && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4" />
              Completado
            </div>
          )}
          {hasUnsavedChanges && !plan.completed && (
            <span className="text-xs text-muted-foreground">Cambios sin guardar</span>
          )}
        </div>
        <div className="flex gap-2">
          {hasUnsavedChanges && (
            <Button
              onClick={handleSave}
              disabled={saving || plan.completed}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Guardar Cambios
            </Button>
          )}
          {!plan.completed && (
            <Button
              onClick={handleComplete}
              disabled={saving}
              variant="default"
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Marcar como Completado
            </Button>
          )}
        </div>
      </div>

      {/* Requerimientos Funcionales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCode className="h-5 w-5 text-blue-600" />
            Requerimientos Funcionales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={functionalReq}
            onChange={(e) => setFunctionalReq(e.target.value)}
            placeholder="Ejemplo:
RF-001: El usuario debe poder registrarse con email/contraseña
RF-002: El sistema debe enviar código de verificación por email
RF-003: El usuario puede crear hasta 5 proyectos en plan gratuito
RF-004: Dashboard debe mostrar métricas en tiempo real
RF-005: Exportar reportes en PDF y Excel"
            rows={12}
            className="font-mono text-sm resize-none"
            disabled={plan.completed}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Define qué debe hacer el sistema. Usa formato RF-XXX para cada requerimiento.
          </p>
        </CardContent>
      </Card>

      {/* Requerimientos No Funcionales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-purple-600" />
            Requerimientos No Funcionales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={nonFunctionalReq}
            onChange={(e) => setNonFunctionalReq(e.target.value)}
            placeholder="Ejemplo:
RNF-001: Tiempo de respuesta < 200ms en p95
RNF-002: Soportar 10,000 usuarios concurrentes
RNF-003: Disponibilidad 99.9% (uptime anual)
RNF-004: Autenticación con JWT y refresh tokens
RNF-005: Encriptación TLS 1.3 en tránsito
RNF-006: Base de datos con backups diarios automáticos"
            rows={12}
            className="font-mono text-sm resize-none"
            disabled={plan.completed}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Define performance, seguridad, escalabilidad y disponibilidad. Usa RNF-XXX.
          </p>
        </CardContent>
      </Card>

      {/* Flujo de Lógica de Negocio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GitBranch className="h-5 w-5 text-green-600" />
            Flujo de Lógica de Negocio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={businessFlow}
            onChange={(e) => setBusinessFlow(e.target.value)}
            placeholder="Ejemplo:
FLUJO DE REGISTRO:
1. Usuario ingresa email/contraseña
2. Sistema valida formato y duplicados
3. Si válido: genera código 6 dígitos
4. Envía email con código
5. Usuario ingresa código
6. Si correcto: crea cuenta y redirige a dashboard
7. Si incorrecto (3 intentos): bloquea por 15 min

FLUJO DE CREACIÓN DE PROYECTO:
1. Usuario hace clic en 'Nuevo Proyecto'
2. Sistema verifica límite de plan (5 para free)
3. Si no excede: muestra formulario
4. Usuario completa datos (nombre, descripción, tipo)
5. Sistema guarda y asigna ID único
6. Redirige a vista de proyecto"
            rows={16}
            className="font-mono text-sm resize-none"
            disabled={plan.completed}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Describe los procesos principales paso a paso, incluyendo estados y transiciones.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
