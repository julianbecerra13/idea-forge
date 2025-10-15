package httpadapter

import (
	"bytes"
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"reflect"
	"strings"
	"time"

	"github.com/dark/idea-forge/internal/ideation/usecase"
	"github.com/google/uuid"
)

type Handlers struct {
	Create     *usecase.CreateIdea
	Get        *usecase.GetIdea
	List       *usecase.ListIdeas
	Update     *usecase.UpdateIdea
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

	// /ideation/ideas/{id}  y  /ideation/ideas/{id}/messages
	mux.HandleFunc("/ideation/ideas/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/messages") {
			h.getMessages(w, r)
			return
		}
		// GET o PUT para una idea específica
		if r.Method == http.MethodPut {
			h.updateIdea(w, r)
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
	var in struct {
		Title                string `json:"title"`
		Objective            string `json:"objective"`
		Problem              string `json:"problem"`
		Scope                string `json:"scope"`
		ValidateCompetition  bool   `json:"validate_competition"`
		ValidateMonetization bool   `json:"validate_monetization"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	idea, err := h.Create.Execute(
		r.Context(), in.Title, in.Objective, in.Problem, in.Scope,
		in.ValidateCompetition, in.ValidateMonetization,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	// Enviar mensaje inicial automático del agente
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := h.sendInitialAgentMessage(ctx, idea); err != nil {
			log.Printf("error sending initial message: %v", err)
		}
	}()

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
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

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

func (h *Handlers) sendInitialAgentMessage(ctx context.Context, idea any) error {
	// Convertir idea a map para el agente
	ideaMap := map[string]any{
		"title":     getField(idea, "Title"),
		"objective": getField(idea, "Objective"),
		"problem":   getField(idea, "Problem"),
		"scope":     getField(idea, "Scope"),
	}

	payload, _ := json.Marshal(map[string]any{
		"idea":    ideaMap,
		"history": []any{},
		"message": "", // Mensaje vacío para trigger inicial
	})

	url := os.Getenv("GENKIT_BASE_URL") + "/flows/ideationAgent"
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if tok := os.Getenv("GENKIT_TOKEN"); tok != "" {
		req.Header.Set("Authorization", "Bearer "+tok)
	}

	resp, err := h.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var out struct {
		Reply string `json:"reply"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return err
	}

	// Guardar mensaje del asistente
	ideaID := getField(idea, "ID")
	if idStr, ok := ideaID.(string); ok {
		if id, err := uuid.Parse(idStr); err == nil {
			_, err := h.Append.Execute(ctx, id, "assistant", out.Reply)
			return err
		}
	}
	return nil
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
