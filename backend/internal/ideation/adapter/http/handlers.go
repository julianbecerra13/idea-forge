package httpadapter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"reflect"
	"strings"

	"github.com/dark/idea-forge/internal/ideation/usecase"
	"github.com/google/uuid"
)

type Handlers struct {
	Create     *usecase.CreateIdea
	Get        *usecase.GetIdea
	List       *usecase.ListIdeas
	Update     *usecase.UpdateIdea
	Delete     *usecase.DeleteIdea
	Append     *usecase.AppendMessage
	HTTPClient *http.Client
}

func (h *Handlers) Register(mux *http.ServeMux) {
	// Crear o listar ideas
	mux.HandleFunc("/ideation/ideas", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			h.listIdeas(w, r)
			return
		}
		h.createIdea(w, r)
	})

	// /ideation/ideas/{id}  y  /ideation/ideas/{id}/messages  y  /ideation/ideas/{id}/edit-section
	mux.HandleFunc("/ideation/ideas/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/messages") {
			h.getMessages(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/edit-section") {
			h.editSection(w, r)
			return
		}
		// GET, PUT o DELETE para una idea específica
		if r.Method == http.MethodPut {
			h.updateIdea(w, r)
			return
		}
		if r.Method == http.MethodDelete {
			h.deleteIdea(w, r)
			return
		}
		h.getIdea(w, r)
	})

	// Chat con el agente
	mux.Handle("/ideation/agent/chat", http.HandlerFunc(h.chat))
}

func (h *Handlers) createIdea(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limitar tamaño del body a 1MB
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var in struct {
		Title                string `json:"title"`
		Objective            string `json:"objective"`
		Problem              string `json:"problem"`
		Scope                string `json:"scope"`
		ValidateCompetition  bool   `json:"validate_competition"`
		ValidateMonetization bool   `json:"validate_monetization"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		log.Printf("Error decoding JSON: %v", err)
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	log.Printf("Received idea data - title: %q, objective: %q, problem: %q, scope: %q",
		in.Title, in.Objective, in.Problem, in.Scope)

	// NUEVO: Mejorar la idea automáticamente con IA antes de guardar
	improved, err := h.improveIdeaWithAI(r.Context(), in.Title, in.Objective, in.Problem, in.Scope)
	if err != nil {
		log.Printf("error improving idea with AI: %v, using original values", err)
		// Si falla, usar valores originales
		improved = map[string]string{
			"title":     in.Title,
			"objective": in.Objective,
			"problem":   in.Problem,
			"scope":     in.Scope,
		}
	}

	log.Printf("Creating idea with values - title: %q, objective: %q, problem: %q, scope: %q",
		improved["title"], improved["objective"], improved["problem"], improved["scope"])

	// Crear idea con valores mejorados
	idea, err := h.Create.Execute(
		r.Context(),
		improved["title"],
		improved["objective"],
		improved["problem"],
		improved["scope"],
		in.ValidateCompetition,
		in.ValidateMonetization,
	)
	if err != nil {
		log.Printf("Error creating idea: %v", err)
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	writeJSON(w, idea, http.StatusOK)
}

func (h *Handlers) getIdea(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	idStr := strings.TrimPrefix(r.URL.Path, "/ideation/ideas/")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}
	idea, err := h.Get.Execute(r.Context(), id)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	writeJSON(w, idea, http.StatusOK)
}

func (h *Handlers) listIdeas(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	ideas, err := h.List.Execute(r.Context(), 50)
	if err != nil {
		http.Error(w, "error listing ideas", http.StatusInternalServerError)
		return
	}
	writeJSON(w, ideas, http.StatusOK)
}

func (h *Handlers) updateIdea(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/ideation/ideas/")
	id, err := uuid.Parse(idStr)
	if err != nil {
		log.Printf("invalid UUID received: %s", idStr)
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	// Limitar tamaño del body a 1MB
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var in struct {
		Title                string `json:"title"`
		Objective            string `json:"objective"`
		Problem              string `json:"problem"`
		Scope                string `json:"scope"`
		ValidateCompetition  bool   `json:"validate_competition"`
		ValidateMonetization bool   `json:"validate_monetization"`
		Completed            *bool  `json:"completed,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	idea, err := h.Update.Execute(
		r.Context(), id, in.Title, in.Objective, in.Problem, in.Scope,
		in.ValidateCompetition, in.ValidateMonetization, in.Completed,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	writeJSON(w, idea, http.StatusOK)
}

func (h *Handlers) deleteIdea(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extraer ID de la URL
	path := strings.TrimPrefix(r.URL.Path, "/ideation/ideas/")
	id, err := uuid.Parse(path)
	if err != nil {
		http.Error(w, "invalid idea ID", http.StatusBadRequest)
		return
	}

	// Eliminar la idea
	if err := h.Delete.Execute(r.Context(), id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) chat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limitar tamaño del body a 1MB para prevenir ataques de memoria
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // 1MB

	var in struct {
		IdeaID  string `json:"idea_id"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	// VALIDACIONES DE INPUT
	if len(in.Message) == 0 {
		http.Error(w, "message cannot be empty", http.StatusBadRequest)
		return
	}

	if len(in.Message) > 10000 { // 10KB máximo por mensaje
		http.Error(w, "message too long (max 10000 chars)", http.StatusBadRequest)
		return
	}

	// Sanitizar espacios
	in.Message = strings.TrimSpace(in.Message)

	ideaID, err := uuid.Parse(in.IdeaID)
	if err != nil {
		http.Error(w, "invalid idea_id", http.StatusBadRequest)
		return
	}

	// 1) Guarda mensaje del usuario
	if _, err := h.Append.Execute(r.Context(), ideaID, "user", in.Message); err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	// 2) Carga idea para contexto
	idea, err := h.Get.Execute(r.Context(), ideaID)
	if err != nil {
		http.Error(w, "idea not found", http.StatusNotFound)
		return
	}

	// 2.1) Obtén últimos N mensajes y forma el history
	msgs, _ := h.Append.Repo().ListMessages(r.Context(), ideaID, 20)
	hist := make([]map[string]string, 0, len(msgs))
	for _, m := range msgs {
		// role: "user" | "assistant" (ignoramos "system" si existiera)
		hist = append(hist, map[string]string{
			"role":    m.Role,
			"content": m.Content,
		})
	}

	// 3) Construye payload para el agente con history real
	body := map[string]any{
		"idea": map[string]any{
			"title":     idea.Title,
			"objective": idea.Objective,
			"problem":   idea.Problem,
			"scope":     idea.Scope,
		},
		"history": hist,
		"message": in.Message,
	}
	payload, _ := json.Marshal(body)

	// 4) Llama al agente en :3001
	url := os.Getenv("GENKIT_BASE_URL") + "/flows/ideationAgent"
	req, _ := http.NewRequest("POST", url, bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	if tok := os.Getenv("GENKIT_TOKEN"); tok != "" {
		req.Header.Set("Authorization", "Bearer "+tok)
	}
	resp, err := h.HTTPClient.Do(req)
	if err != nil {
		http.Error(w, "agent unreachable: "+err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()

	var out struct {
		Reply        string            `json:"reply"`
		ShouldUpdate bool              `json:"shouldUpdate"`
		Updates      map[string]string `json:"updates"`
		IsComplete   bool              `json:"isComplete"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		http.Error(w, "bad agent response", http.StatusBadGateway)
		return
	}

	// 5) Si el agente sugiere actualizaciones o marca como completa, aplicarlas
	if (out.ShouldUpdate && len(out.Updates) > 0) || out.IsComplete {
		var completed *bool
		// Marcar la idea como completada si el agente lo indica
		if out.IsComplete {
			completedVal := true
			completed = &completedVal
		}

		// Actualizar idea con los campos sugeridos por el agente
		_, err := h.Update.Execute(
			r.Context(),
			ideaID,
			out.Updates["title"],
			out.Updates["objective"],
			out.Updates["problem"],
			out.Updates["scope"],
			idea.ValidateCompetition,
			idea.ValidateMonetization,
			completed,
		)
		if err != nil {
			// No fallar si la actualización falla, solo loguear
			http.Error(w, "error updating idea: "+err.Error(), http.StatusUnprocessableEntity)
			return
		}
	}

	// 6) Guarda respuesta del asistente
	if _, err := h.Append.Execute(r.Context(), ideaID, "assistant", out.Reply); err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	writeJSON(w, out, http.StatusOK)
}

func writeJSON(w http.ResponseWriter, v any, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func (h *Handlers) getMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/ideation/ideas/")
	if !strings.HasSuffix(path, "/messages") {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	idStr := strings.TrimSuffix(path, "/messages")
	ideaID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	// Usamos el repo expuesto por el usecase
	msgs, err := h.Append.Repo().ListMessages(r.Context(), ideaID, 50)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	writeJSON(w, msgs, http.StatusOK)
}


func getField(obj any, field string) any {
	// Helper para extraer campos de struct via reflection simplificado
	if m, ok := obj.(map[string]any); ok {
		return m[field]
	}
	// Usar reflection para structs
	v := reflect.ValueOf(obj)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	if v.Kind() == reflect.Struct {
		f := v.FieldByName(field)
		if f.IsValid() {
			return f.Interface()
		}
	}
	return nil
}

// improveIdeaWithAI llama al agente de IA para mejorar la idea inicial
func (h *Handlers) improveIdeaWithAI(ctx context.Context, title, objective, problem, scope string) (map[string]string, error) {
	payload, _ := json.Marshal(map[string]any{
		"title":     title,
		"objective": objective,
		"problem":   problem,
		"scope":     scope,
	})

	url := os.Getenv("GENKIT_BASE_URL") + "/ideation/improve-initial"
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(payload))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if tok := os.Getenv("GENKIT_TOKEN"); tok != "" {
		req.Header.Set("Authorization", "Bearer "+tok)
	}

	resp, err := h.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error calling genkit: %w", err)
	}
	defer resp.Body.Close()

	// Verificar status code de Genkit
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("genkit returned status %d", resp.StatusCode)
	}

	var out struct {
		Title     string `json:"title"`
		Objective string `json:"objective"`
		Problem   string `json:"problem"`
		Scope     string `json:"scope"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}

	return map[string]string{
		"title":     out.Title,
		"objective": out.Objective,
		"problem":   out.Problem,
		"scope":     out.Scope,
	}, nil
}

// editSection maneja la edición de una sección específica con IA
func (h *Handlers) editSection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Limitar tamaño del body a 1MB
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	// Extraer ID de la URL: /ideation/ideas/{id}/edit-section
	path := strings.TrimPrefix(r.URL.Path, "/ideation/ideas/")
	idStr := strings.TrimSuffix(path, "/edit-section")

	ideaID, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid idea id", http.StatusBadRequest)
		return
	}

	var in struct {
		Section string `json:"section"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	// Validar inputs
	if in.Section == "" || in.Message == "" {
		http.Error(w, "section and message are required", http.StatusBadRequest)
		return
	}

	validSections := []string{"title", "objective", "problem", "scope"}
	isValid := false
	for _, s := range validSections {
		if in.Section == s {
			isValid = true
			break
		}
	}
	if !isValid {
		http.Error(w, "invalid section", http.StatusBadRequest)
		return
	}

	// Cargar idea para obtener el contexto completo
	idea, err := h.Get.Execute(r.Context(), ideaID)
	if err != nil {
		http.Error(w, "idea not found", http.StatusNotFound)
		return
	}

	// Preparar payload para Genkit
	payload, _ := json.Marshal(map[string]any{
		"section": in.Section,
		"message": in.Message,
		"idea": map[string]string{
			"title":     idea.Title,
			"objective": idea.Objective,
			"problem":   idea.Problem,
			"scope":     idea.Scope,
		},
	})

	url := os.Getenv("GENKIT_BASE_URL") + "/ideation/edit-section"
	req, err := http.NewRequestWithContext(r.Context(), "POST", url, bytes.NewReader(payload))
	if err != nil {
		http.Error(w, "error creating request", http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	if tok := os.Getenv("GENKIT_TOKEN"); tok != "" {
		req.Header.Set("Authorization", "Bearer "+tok)
	}

	resp, err := h.HTTPClient.Do(req)
	if err != nil {
		log.Printf("error calling genkit: %v", err)
		http.Error(w, "error calling AI service", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("genkit returned status %d for edit-section", resp.StatusCode)
		// Cualquier error de Genkit (429, 500, etc.) se considera servicio no disponible temporalmente
		// porque generalmente son problemas de cuota o límite de tasa de la API de IA
		http.Error(w, "AI service temporarily unavailable. Please try again in a few minutes.", http.StatusServiceUnavailable)
		return
	}

	var out struct {
		Reply          string `json:"reply"`
		UpdatedSection string `json:"updatedSection"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		http.Error(w, "error decoding response", http.StatusInternalServerError)
		return
	}

	writeJSON(w, out, http.StatusOK)
}
