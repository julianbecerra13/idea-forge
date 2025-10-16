package httpadapter

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/architecture/domain"
	"github.com/dark/idea-forge/internal/architecture/usecase"
	actionplandomain "github.com/dark/idea-forge/internal/actionplan/domain"
	ideadomain "github.com/dark/idea-forge/internal/ideation/domain"
)

type Handlers struct {
	Usecase         *usecase.ArchitectureUsecase
	HTTPClient      *http.Client
	ActionPlanUsecase interface {
		GetActionPlan(ctx context.Context, id uuid.UUID) (*actionplandomain.ActionPlan, error)
	}
	IdeaUsecase interface {
		Execute(ctx context.Context, id uuid.UUID) (*ideadomain.Idea, error)
	}
}

func (h *Handlers) Register(mux *http.ServeMux) {
	mux.HandleFunc("/architecture", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			h.createArchitecture(w, r)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	})

	mux.HandleFunc("/architecture/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/messages") {
			h.getMessages(w, r)
			return
		}
		if strings.Contains(r.URL.Path, "/by-action-plan/") {
			h.getArchitectureByActionPlanID(w, r)
			return
		}
		if r.Method == http.MethodGet {
			h.getArchitecture(w, r)
			return
		}
		if r.Method == http.MethodPut {
			h.updateArchitecture(w, r)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	})

	mux.HandleFunc("/architecture/agent/chat", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			h.handleChat(w, r)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	})
}

func (h *Handlers) createArchitecture(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ActionPlanID string `json:"action_plan_id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	actionPlanID, err := uuid.Parse(req.ActionPlanID)
	if err != nil {
		http.Error(w, "invalid action_plan_id", http.StatusBadRequest)
		return
	}

	arch, err := h.Usecase.CreateArchitecture(r.Context(), actionPlanID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Obtener action plan para contexto
	actionPlan, err := h.ActionPlanUsecase.GetActionPlan(r.Context(), actionPlanID)
	if err != nil {
		log.Printf("error fetching action plan: %v", err)
	}

	// Obtener idea para contexto completo
	if actionPlan != nil {
		idea, err := h.IdeaUsecase.Execute(r.Context(), actionPlan.IdeaID)
		if err != nil {
			log.Printf("error fetching idea: %v", err)
		}
		_ = idea
	}

	// Generar contenido inicial con IA
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	if err := h.generateAndSaveInitialContent(ctx, arch, actionPlan); err != nil {
		log.Printf("error generating initial architecture: %v", err)
	}

	// Recargar con contenido generado
	updatedArch, err := h.Usecase.GetArchitecture(r.Context(), arch.ID)
	if err != nil {
		log.Printf("error reloading architecture: %v", err)
		writeJSON(w, arch, http.StatusOK)
		return
	}

	writeJSON(w, updatedArch, http.StatusOK)
}

func (h *Handlers) generateAndSaveInitialContent(ctx context.Context, arch *domain.Architecture, actionPlan *actionplandomain.ActionPlan) error {
	genkitURL := os.Getenv("GENKIT_BASE_URL")
	if genkitURL == "" {
		genkitURL = "http://localhost:3001"
	}

	payload := map[string]interface{}{
		"architecture_id": arch.ID.String(),
		"action_plan":     actionPlan,
	}

	body, _ := json.Marshal(payload)
	req, _ := http.NewRequestWithContext(ctx, "POST", genkitURL+"/architecture/generate-initial", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	genkitToken := os.Getenv("GENKIT_TOKEN")
	if genkitToken != "" {
		req.Header.Set("Authorization", "Bearer "+genkitToken)
	}

	resp, err := h.HTTPClient.Do(req)
	if err != nil {
		return fmt.Errorf("genkit request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("genkit returned status %d", resp.StatusCode)
	}

	return nil
}

func (h *Handlers) getArchitecture(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/architecture/")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	arch, err := h.Usecase.GetArchitecture(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	writeJSON(w, arch, http.StatusOK)
}

func (h *Handlers) getArchitectureByActionPlanID(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/by-action-plan/")
	if len(parts) < 2 {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	actionPlanID, err := uuid.Parse(parts[1])
	if err != nil {
		http.Error(w, "invalid action_plan_id", http.StatusBadRequest)
		return
	}

	arch, err := h.Usecase.GetArchitectureByActionPlanID(r.Context(), actionPlanID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	writeJSON(w, arch, http.StatusOK)
}

func (h *Handlers) updateArchitecture(w http.ResponseWriter, r *http.Request) {
	idStr := strings.TrimPrefix(r.URL.Path, "/architecture/")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	arch, err := h.Usecase.GetArchitecture(r.Context(), id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	var updates struct {
		Status                *string `json:"status"`
		UserStories           *string `json:"user_stories"`
		DatabaseType          *string `json:"database_type"`
		DatabaseSchema        *string `json:"database_schema"`
		EntitiesRelationships *string `json:"entities_relationships"`
		TechStack             *string `json:"tech_stack"`
		ArchitecturePattern   *string `json:"architecture_pattern"`
		SystemArchitecture    *string `json:"system_architecture"`
		Completed             *bool   `json:"completed"`
	}

	if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	if updates.Status != nil {
		arch.Status = *updates.Status
	}
	if updates.UserStories != nil {
		arch.UserStories = *updates.UserStories
	}
	if updates.DatabaseType != nil {
		arch.DatabaseType = *updates.DatabaseType
	}
	if updates.DatabaseSchema != nil {
		arch.DatabaseSchema = *updates.DatabaseSchema
	}
	if updates.EntitiesRelationships != nil {
		arch.EntitiesRelationships = *updates.EntitiesRelationships
	}
	if updates.TechStack != nil {
		arch.TechStack = *updates.TechStack
	}
	if updates.ArchitecturePattern != nil {
		arch.ArchitecturePattern = *updates.ArchitecturePattern
	}
	if updates.SystemArchitecture != nil {
		arch.SystemArchitecture = *updates.SystemArchitecture
	}
	if updates.Completed != nil {
		arch.Completed = *updates.Completed
	}

	if err := h.Usecase.UpdateArchitecture(r.Context(), arch); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, arch, http.StatusOK)
}

func (h *Handlers) getMessages(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(r.URL.Path, "/architecture/")
	if len(parts) < 2 {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}
	idStr := strings.TrimSuffix(parts[1], "/messages")
	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	messages, err := h.Usecase.GetMessages(r.Context(), id, 100)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, messages, http.StatusOK)
}

func (h *Handlers) handleChat(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ArchitectureID string `json:"architecture_id"`
		Message        string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	archID, err := uuid.Parse(req.ArchitectureID)
	if err != nil {
		http.Error(w, "invalid architecture_id", http.StatusBadRequest)
		return
	}

	arch, err := h.Usecase.GetArchitecture(r.Context(), archID)
	if err != nil {
		http.Error(w, "architecture not found", http.StatusNotFound)
		return
	}

	// Guardar mensaje del usuario
	userMsg := &domain.ArchitectureMessage{
		ID:             uuid.New(),
		ArchitectureID: archID,
		Role:           "user",
		Content:        req.Message,
	}
	if err := h.Usecase.AddMessage(r.Context(), userMsg); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Obtener Action Plan y Idea para contexto
	actionPlan, _ := h.ActionPlanUsecase.GetActionPlan(r.Context(), arch.ActionPlanID)
	var idea *ideadomain.Idea
	if actionPlan != nil {
		idea, _ = h.IdeaUsecase.Execute(r.Context(), actionPlan.IdeaID)
	}

	// Llamar a Genkit
	ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
	defer cancel()

	genkitURL := os.Getenv("GENKIT_BASE_URL")
	if genkitURL == "" {
		genkitURL = "http://localhost:3001"
	}

	payload := map[string]interface{}{
		"architecture_id": archID.String(),
		"message":         req.Message,
		"architecture":    arch,
		"action_plan":     actionPlan,
		"idea":            idea,
	}

	body, _ := json.Marshal(payload)
	genkitReq, _ := http.NewRequestWithContext(ctx, "POST", genkitURL+"/architecture/chat", bytes.NewReader(body))
	genkitReq.Header.Set("Content-Type", "application/json")

	genkitToken := os.Getenv("GENKIT_TOKEN")
	if genkitToken != "" {
		genkitReq.Header.Set("Authorization", "Bearer "+genkitToken)
	}

	resp, err := h.HTTPClient.Do(genkitReq)
	if err != nil {
		http.Error(w, "genkit request failed", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		http.Error(w, fmt.Sprintf("genkit error: %d", resp.StatusCode), http.StatusInternalServerError)
		return
	}

	var genkitResp struct {
		Response string `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&genkitResp); err != nil {
		http.Error(w, "invalid genkit response", http.StatusInternalServerError)
		return
	}

	// Guardar respuesta del asistente
	assistantMsg := &domain.ArchitectureMessage{
		ID:             uuid.New(),
		ArchitectureID: archID,
		Role:           "assistant",
		Content:        genkitResp.Response,
	}
	if err := h.Usecase.AddMessage(r.Context(), assistantMsg); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, map[string]string{"response": genkitResp.Response}, http.StatusOK)
}

func writeJSON(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
