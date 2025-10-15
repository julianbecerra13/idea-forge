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

	"github.com/dark/idea-forge/internal/actionplan/domain"
	"github.com/dark/idea-forge/internal/actionplan/usecase"
	"github.com/google/uuid"
)

type Handlers struct {
	Usecase    *usecase.ActionPlanUsecase
	HTTPClient *http.Client
}

func (h *Handlers) Register(mux *http.ServeMux) {
	// Create action plan from idea
	mux.HandleFunc("/action-plan", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			h.createActionPlan(w, r)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	})

	// Get action plan by ID or by idea ID
	mux.HandleFunc("/action-plan/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/messages") {
			h.getMessages(w, r)
			return
		}
		if strings.Contains(r.URL.Path, "/by-idea/") {
			h.getActionPlanByIdeaID(w, r)
			return
		}
		if r.Method == http.MethodGet {
			h.getActionPlan(w, r)
			return
		}
		if r.Method == http.MethodPut {
			h.updateActionPlan(w, r)
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	})

	// Chat with action plan agent
	mux.HandleFunc("/action-plan/agent/chat", h.chat)
}

func (h *Handlers) createActionPlan(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var in struct {
		IdeaID string `json:"idea_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	ideaID, err := uuid.Parse(in.IdeaID)
	if err != nil {
		http.Error(w, "invalid idea_id", http.StatusBadRequest)
		return
	}

	plan, err := h.Usecase.CreateActionPlan(r.Context(), ideaID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	// Send initial agent message
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := h.sendInitialAgentMessage(ctx, plan, ideaID); err != nil {
			log.Printf("error sending initial action plan message: %v", err)
		}
	}()

	writeJSON(w, plan, http.StatusOK)
}

func (h *Handlers) getActionPlan(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 2 {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(pathParts[len(pathParts)-1])
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	plan, err := h.Usecase.GetActionPlan(r.Context(), id)
	if err != nil {
		http.Error(w, "action plan not found", http.StatusNotFound)
		return
	}

	writeJSON(w, plan, http.StatusOK)
}

func (h *Handlers) getActionPlanByIdeaID(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 3 {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	ideaID, err := uuid.Parse(pathParts[len(pathParts)-1])
	if err != nil {
		http.Error(w, "invalid idea_id", http.StatusBadRequest)
		return
	}

	plan, err := h.Usecase.GetActionPlanByIdeaID(r.Context(), ideaID)
	if err != nil {
		http.Error(w, "action plan not found", http.StatusNotFound)
		return
	}

	writeJSON(w, plan, http.StatusOK)
}

func (h *Handlers) updateActionPlan(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 2 {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(pathParts[len(pathParts)-1])
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	var in struct {
		Status                    *string `json:"status"`
		FunctionalRequirements    *string `json:"functional_requirements"`
		NonFunctionalRequirements *string `json:"non_functional_requirements"`
		BusinessLogicFlow         *string `json:"business_logic_flow"`
		Completed                 *bool   `json:"completed"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	plan, err := h.Usecase.GetActionPlan(r.Context(), id)
	if err != nil {
		http.Error(w, "action plan not found", http.StatusNotFound)
		return
	}

	if in.Status != nil {
		plan.Status = *in.Status
	}
	if in.FunctionalRequirements != nil {
		plan.FunctionalRequirements = *in.FunctionalRequirements
	}
	if in.NonFunctionalRequirements != nil {
		plan.NonFunctionalRequirements = *in.NonFunctionalRequirements
	}
	if in.BusinessLogicFlow != nil {
		plan.BusinessLogicFlow = *in.BusinessLogicFlow
	}
	if in.Completed != nil {
		plan.Completed = *in.Completed
	}

	if err := h.Usecase.UpdateActionPlan(r.Context(), plan); err != nil {
		http.Error(w, err.Error(), http.StatusUnprocessableEntity)
		return
	}

	writeJSON(w, plan, http.StatusOK)
}

func (h *Handlers) getMessages(w http.ResponseWriter, r *http.Request) {
	pathParts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(pathParts) < 3 {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(pathParts[len(pathParts)-2])
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

func (h *Handlers) chat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var in struct {
		ActionPlanID string `json:"action_plan_id"`
		Message      string `json:"message"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	in.Message = strings.TrimSpace(in.Message)
	if len(in.Message) == 0 {
		http.Error(w, "message cannot be empty", http.StatusBadRequest)
		return
	}
	if len(in.Message) > 10000 {
		http.Error(w, "message too long (max 10000 chars)", http.StatusBadRequest)
		return
	}

	planID, err := uuid.Parse(in.ActionPlanID)
	if err != nil {
		http.Error(w, "invalid action_plan_id", http.StatusBadRequest)
		return
	}

	plan, err := h.Usecase.GetActionPlan(r.Context(), planID)
	if err != nil {
		http.Error(w, "action plan not found", http.StatusNotFound)
		return
	}

	// Save user message
	userMsg := &domain.ActionPlanMessage{
		ID:           uuid.New(),
		ActionPlanID: planID,
		Role:         "user",
		Content:      in.Message,
	}
	if err := h.Usecase.AddMessage(r.Context(), userMsg); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Call Genkit agent
	agentResp, err := h.callGenkitAgent(r.Context(), plan, in.Message)
	if err != nil {
		log.Printf("error calling genkit: %v", err)
		http.Error(w, "error calling agent", http.StatusBadGateway)
		return
	}

	// Save agent response
	agentMsg := &domain.ActionPlanMessage{
		ID:           uuid.New(),
		ActionPlanID: planID,
		Role:         "assistant",
		Content:      agentResp,
	}
	if err := h.Usecase.AddMessage(r.Context(), agentMsg); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, agentMsg, http.StatusOK)
}

func (h *Handlers) sendInitialAgentMessage(ctx context.Context, plan *domain.ActionPlan, ideaID uuid.UUID) error {
	// For now, send a generic initial message
	// In production, you'd fetch the idea details and create a richer context
	initialPrompt := fmt.Sprintf("He completado mi idea y quiero crear un plan de acción detallado. El ID de la idea es %s. ¿Cómo puedes ayudarme a levantar los requerimientos funcionales, no funcionales y el flujo de lógica de negocio?", ideaID)

	response, err := h.callGenkitAgent(ctx, plan, initialPrompt)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return fmt.Errorf("timeout calling genkit for initial message (30s exceeded): %w", err)
		}
		return fmt.Errorf("error calling genkit for initial message: %w", err)
	}

	msg := &domain.ActionPlanMessage{
		ID:           uuid.New(),
		ActionPlanID: plan.ID,
		Role:         "assistant",
		Content:      response,
	}

	return h.Usecase.AddMessage(ctx, msg)
}

func (h *Handlers) callGenkitAgent(ctx context.Context, plan *domain.ActionPlan, userMessage string) (string, error) {
	genkitURL := os.Getenv("GENKIT_BASE_URL")
	if genkitURL == "" {
		genkitURL = "http://localhost:3001"
	}

	payload := map[string]interface{}{
		"action_plan_id": plan.ID.String(),
		"idea_id":        plan.IdeaID.String(),
		"message":        userMessage,
		"context": map[string]interface{}{
			"functional_requirements":     plan.FunctionalRequirements,
			"non_functional_requirements": plan.NonFunctionalRequirements,
			"business_logic_flow":         plan.BusinessLogicFlow,
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, genkitURL+"/action-plan/chat", bytes.NewReader(jsonData))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := h.HTTPClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("genkit returned status %d", resp.StatusCode)
	}

	var result struct {
		Response string `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.Response, nil
}

func writeJSON(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
