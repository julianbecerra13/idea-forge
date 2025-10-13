"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit2, Target, AlertCircle, Maximize2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

type Idea = {
  ID: string;
  Title: string;
  Objective: string;
  Problem: string;
  Scope: string;
  ValidateCompetition: boolean;
  ValidateMonetization: boolean;
  CreatedAt: string;
};

export default function IdeaCards({ idea }: { idea: Idea }) {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const handleEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const handleSave = () => {
    // Por ahora solo UI - no hay endpoint de update
    toast.info("Edición guardada localmente (sin endpoint backend)");
    setEditingField(null);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Card: Título/Idea */}
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Idea
            </CardTitle>
            <Dialog open={editingField === "title"} onOpenChange={(open) => !open && setEditingField(null)}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit("title", idea.Title)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Título</DialogTitle>
                  <DialogDescription>
                    Modifica el título de tu idea
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Título</Label>
                  <Input
                    id="edit-title"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingField(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-base font-medium">{idea.Title}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Creado: {new Date(idea.CreatedAt).toLocaleDateString("es-ES")}
          </p>
        </CardContent>
      </Card>

      {/* Card: Objetivo */}
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Objetivo
            </CardTitle>
            <Dialog open={editingField === "objective"} onOpenChange={(open) => !open && setEditingField(null)}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit("objective", idea.Objective)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Objetivo</DialogTitle>
                  <DialogDescription>
                    ¿Qué quieres lograr con este proyecto?
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="edit-objective">Objetivo</Label>
                  <Textarea
                    id="edit-objective"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingField(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{idea.Objective}</p>
        </CardContent>
      </Card>

      {/* Card: Problema */}
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Problema
            </CardTitle>
            <Dialog open={editingField === "problem"} onOpenChange={(open) => !open && setEditingField(null)}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit("problem", idea.Problem)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Problema</DialogTitle>
                  <DialogDescription>
                    ¿Qué problema resuelve tu proyecto?
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="edit-problem">Problema</Label>
                  <Textarea
                    id="edit-problem"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingField(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{idea.Problem}</p>
        </CardContent>
      </Card>

      {/* Card: Alcance */}
      <Card className="transition-all hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Maximize2 className="h-5 w-5 text-blue-600" />
              Alcance
            </CardTitle>
            <Dialog open={editingField === "scope"} onOpenChange={(open) => !open && setEditingField(null)}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEdit("scope", idea.Scope)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Editar Alcance</DialogTitle>
                  <DialogDescription>
                    Define el alcance y límites del proyecto
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="edit-scope">Alcance</Label>
                  <Textarea
                    id="edit-scope"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={4}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingField(null)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>Guardar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{idea.Scope}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant={idea.ValidateCompetition ? "default" : "secondary"}>
              {idea.ValidateCompetition ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
              Competencia
            </Badge>
            <Badge variant={idea.ValidateMonetization ? "default" : "secondary"}>
              {idea.ValidateMonetization ? <CheckCircle className="mr-1 h-3 w-3" /> : <XCircle className="mr-1 h-3 w-3" />}
              Monetización
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
