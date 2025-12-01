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
	"github.com/dark/idea-forge/internal/devmodule/domain"
	"github.com/dark/idea-forge/internal/devmodule/usecase"
	actionplandomain "github.com/dark/idea-forge/internal/actionplan/domain"
	archdomain "github.com/dark/idea-forge/internal/architecture/domain"
	ideadomain "github.com/dark/idea-forge/internal/ideation/domain"
)

type Handlers struct {
	Usecase    *usecase.DevModuleUsecase
	HTTPClient *http.Client

	// Dependencies for full context
	IdeaUsecase interface {
		Execute(ctx context.Context, id uuid.UUID) (*ideadomain.Idea, error)
	}
	IdeaUpdateUsecase interface {
		Execute(ctx context.Context, id uuid.UUID, title, objective, problem, scope string, validateCompetition, validateMonetization bool, completed *bool) (*ideadomain.Idea, error)
	}
	ActionPlanUsecase interface {
		GetActionPlan(ctx context.Context, id uuid.UUID) (*actionplandomain.ActionPlan, error)
		GetActionPlanByIdeaID(ctx context.Context, ideaID uuid.UUID) (*actionplandomain.ActionPlan, error)
		UpdateActionPlan(ctx context.Context, plan *actionplandomain.ActionPlan) error
	}
	ArchitectureUsecase interface {
		GetArchitecture(ctx context.Context, id uuid.UUID) (*archdomain.Architecture, error)
		GetArchitectureByActionPlanID(ctx context.Context, actionPlanID uuid.UUID) (*archdomain.Architecture, error)
		UpdateArchitecture(ctx context.Context, arch *archdomain.Architecture) error
	}
}

func (h *Handlers) Register(mux *http.ServeMux) {
	// Development modules endpoints
	mux.HandleFunc("/dev-modules/by-architecture/", h.getModulesByArchitecture)
	mux.HandleFunc("/dev-modules/", h.handleModule)
	mux.HandleFunc("/dev-modules", h.handleModules)

	// Global chat endpoint
	mux.HandleFunc("/global-chat", h.handleGlobalChat)
	mux.HandleFunc("/global-chat/messages/", h.getGlobalChatMessages)
}

func (h *Handlers) getModulesByArchitecture(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract architecture ID from path: /dev-modules/by-architecture/{id}
	archIDStr := strings.TrimPrefix(r.URL.Path, "/dev-modules/by-architecture/")
	archID, err := uuid.Parse(archIDStr)
	if err != nil {
		http.Error(w, "invalid architecture_id", http.StatusBadRequest)
		return
	}

	modules, err := h.Usecase.GetModulesByArchitectureID(r.Context(), archID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if modules == nil {
		modules = []domain.DevelopmentModule{}
	}

	writeJSON(w, modules, http.StatusOK)
}

func (h *Handlers) handleModule(w http.ResponseWriter, r *http.Request) {
	// Extract module ID from path: /dev-modules/{id}
	idStr := strings.TrimPrefix(r.URL.Path, "/dev-modules/")
	if idStr == "" || strings.Contains(idStr, "/") {
		http.Error(w, "invalid path", http.StatusBadRequest)
		return
	}

	id, err := uuid.Parse(idStr)
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		module, err := h.Usecase.GetModule(r.Context(), id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}
		writeJSON(w, module, http.StatusOK)

	case http.MethodPut:
		var updates struct {
			Name             *string `json:"name"`
			Description      *string `json:"description"`
			Functionality    *string `json:"functionality"`
			Dependencies     *string `json:"dependencies"`
			TechnicalDetails *string `json:"technical_details"`
			Priority         *int    `json:"priority"`
			Status           *string `json:"status"`
		}

		if err := json.NewDecoder(r.Body).Decode(&updates); err != nil {
			http.Error(w, "invalid request", http.StatusBadRequest)
			return
		}

		module, err := h.Usecase.GetModule(r.Context(), id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusNotFound)
			return
		}

		if updates.Name != nil {
			module.Name = *updates.Name
		}
		if updates.Description != nil {
			module.Description = *updates.Description
		}
		if updates.Functionality != nil {
			module.Functionality = *updates.Functionality
		}
		if updates.Dependencies != nil {
			module.Dependencies = *updates.Dependencies
		}
		if updates.TechnicalDetails != nil {
			module.TechnicalDetails = *updates.TechnicalDetails
		}
		if updates.Priority != nil {
			module.Priority = *updates.Priority
		}
		if updates.Status != nil {
			module.Status = *updates.Status
		}

		if err := h.Usecase.UpdateModule(r.Context(), module); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		writeJSON(w, module, http.StatusOK)

	case http.MethodDelete:
		if err := h.Usecase.DeleteModule(r.Context(), id); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusNoContent)

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *Handlers) handleModules(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ArchitectureID string `json:"architecture_id"`
		Name           string `json:"name"`
		Description    string `json:"description"`
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

	module := &domain.DevelopmentModule{
		ArchitectureID: archID,
		Name:           req.Name,
		Description:    req.Description,
		Status:         "pending",
	}

	if err := h.Usecase.CreateModule(r.Context(), module); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	writeJSON(w, module, http.StatusCreated)
}

func (h *Handlers) getGlobalChatMessages(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract idea ID from path: /global-chat/messages/{idea_id}
	ideaIDStr := strings.TrimPrefix(r.URL.Path, "/global-chat/messages/")
	ideaID, err := uuid.Parse(ideaIDStr)
	if err != nil {
		http.Error(w, "invalid idea_id", http.StatusBadRequest)
		return
	}

	messages, err := h.Usecase.GetGlobalMessages(r.Context(), ideaID, 100)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if messages == nil {
		messages = []domain.GlobalChatMessage{}
	}

	writeJSON(w, messages, http.StatusOK)
}

func (h *Handlers) handleGlobalChat(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		IdeaID  string `json:"idea_id"`
		Message string `json:"message"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}

	ideaID, err := uuid.Parse(req.IdeaID)
	if err != nil {
		http.Error(w, "invalid idea_id", http.StatusBadRequest)
		return
	}

	// Get full context
	idea, err := h.IdeaUsecase.Execute(r.Context(), ideaID)
	if err != nil {
		http.Error(w, "idea not found", http.StatusNotFound)
		return
	}

	// Get action plan if exists
	actionPlan, _ := h.ActionPlanUsecase.GetActionPlanByIdeaID(r.Context(), ideaID)

	// Get architecture if exists
	var architecture *archdomain.Architecture
	var modules []domain.DevelopmentModule
	if actionPlan != nil {
		architecture, _ = h.ArchitectureUsecase.GetArchitectureByActionPlanID(r.Context(), actionPlan.ID)
		if architecture != nil {
			modules, _ = h.Usecase.GetModulesByArchitectureID(r.Context(), architecture.ID)
		}
	}

	// Save user message
	userMsg := &domain.GlobalChatMessage{
		IdeaID:  ideaID,
		Role:    "user",
		Content: req.Message,
	}
	if err := h.Usecase.AddGlobalMessage(r.Context(), userMsg); err != nil {
		log.Printf("error saving user message: %v", err)
	}

	// Call Genkit global chat
	ctx, cancel := context.WithTimeout(r.Context(), 60*time.Second)
	defer cancel()

	genkitResult, err := h.callGenkitGlobalChat(ctx, idea, actionPlan, architecture, modules, req.Message)
	if err != nil {
		log.Printf("error calling genkit global chat: %v", err)
		http.Error(w, "error calling AI agent", http.StatusBadGateway)
		return
	}

	// Apply propagations
	affectedModules := h.applyPropagations(r.Context(), idea, actionPlan, architecture, genkitResult)

	// Create new development modules if any
	if architecture != nil && len(genkitResult.NewModules) > 0 {
		for _, newMod := range genkitResult.NewModules {
			module := &domain.DevelopmentModule{
				ArchitectureID:   architecture.ID,
				Name:             newMod.Name,
				Description:      newMod.Description,
				Functionality:    newMod.Functionality,
				TechnicalDetails: newMod.TechnicalDetails,
				Status:           "pending",
			}
			if err := h.Usecase.CreateModule(r.Context(), module); err != nil {
				log.Printf("error creating new module: %v", err)
			} else {
				affectedModules = append(affectedModules, "dev_modules")
			}
		}
	}

	// Save assistant message
	affectedJSON, _ := json.Marshal(affectedModules)
	assistantMsg := &domain.GlobalChatMessage{
		IdeaID:          ideaID,
		Role:            "assistant",
		Content:         genkitResult.Reply,
		AffectedModules: string(affectedJSON),
	}
	if err := h.Usecase.AddGlobalMessage(r.Context(), assistantMsg); err != nil {
		log.Printf("error saving assistant message: %v", err)
	}

	writeJSON(w, map[string]interface{}{
		"reply":            genkitResult.Reply,
		"affected_modules": affectedModules,
		"propagation":      genkitResult.Propagation,
		"new_modules":      genkitResult.NewModules,
	}, http.StatusOK)
}

type GenkitGlobalChatResult struct {
	Reply       string                   `json:"reply"`
	IsGlobal    bool                     `json:"is_global"`
	Propagation map[string]interface{}   `json:"propagation"`
	NewModules  []NewModuleInfo          `json:"new_modules"`
}

type NewModuleInfo struct {
	Name             string `json:"name"`
	Description      string `json:"description"`
	Functionality    string `json:"functionality"`
	TechnicalDetails string `json:"technical_details"`
}

func (h *Handlers) callGenkitGlobalChat(ctx context.Context, idea *ideadomain.Idea, actionPlan *actionplandomain.ActionPlan, architecture *archdomain.Architecture, modules []domain.DevelopmentModule, message string) (*GenkitGlobalChatResult, error) {
	genkitURL := os.Getenv("GENKIT_BASE_URL")
	if genkitURL == "" {
		genkitURL = "http://localhost:3001"
	}

	payload := map[string]interface{}{
		"message":      message,
		"idea":         idea,
		"action_plan":  actionPlan,
		"architecture": architecture,
		"modules":      modules,
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, genkitURL+"/global-chat", bytes.NewReader(jsonData))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	genkitToken := os.Getenv("GENKIT_TOKEN")
	if genkitToken != "" {
		req.Header.Set("Authorization", "Bearer "+genkitToken)
	}

	resp, err := h.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("genkit returned status %d", resp.StatusCode)
	}

	var result GenkitGlobalChatResult
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	return &result, nil
}

func (h *Handlers) applyPropagations(ctx context.Context, idea *ideadomain.Idea, actionPlan *actionplandomain.ActionPlan, architecture *archdomain.Architecture, result *GenkitGlobalChatResult) []string {
	var affected []string

	if result.Propagation == nil {
		return affected
	}

	// Apply ideation updates
	if ideation, ok := result.Propagation["ideation"].(map[string]interface{}); ok {
		title := idea.Title
		objective := idea.Objective
		problem := idea.Problem
		scope := idea.Scope
		updated := false

		if t, ok := ideation["title"].(string); ok && t != "" {
			title = t
			updated = true
		}
		if o, ok := ideation["objective"].(string); ok && o != "" {
			objective = o
			updated = true
		}
		if p, ok := ideation["problem"].(string); ok && p != "" {
			problem = p
			updated = true
		}
		if s, ok := ideation["scope"].(string); ok && s != "" {
			scope = s
			updated = true
		}
		if updated && h.IdeaUpdateUsecase != nil {
			if _, err := h.IdeaUpdateUsecase.Execute(ctx, idea.ID, title, objective, problem, scope, idea.ValidateCompetition, idea.ValidateMonetization, nil); err != nil {
				log.Printf("error updating idea: %v", err)
			} else {
				affected = append(affected, "ideation")
			}
		}
	}

	// Apply action plan updates
	if actionPlan != nil {
		if ap, ok := result.Propagation["action_plan"].(map[string]interface{}); ok {
			updated := false
			if fr, ok := ap["functional_requirements"].(string); ok && fr != "" {
				actionPlan.FunctionalRequirements = fr
				updated = true
			}
			if nfr, ok := ap["non_functional_requirements"].(string); ok && nfr != "" {
				actionPlan.NonFunctionalRequirements = nfr
				updated = true
			}
			if blf, ok := ap["business_logic_flow"].(string); ok && blf != "" {
				actionPlan.BusinessLogicFlow = blf
				updated = true
			}
			if updated {
				if err := h.ActionPlanUsecase.UpdateActionPlan(ctx, actionPlan); err != nil {
					log.Printf("error updating action plan: %v", err)
				} else {
					affected = append(affected, "action_plan")
				}
			}
		}
	}

	// Apply architecture updates
	if architecture != nil {
		if arch, ok := result.Propagation["architecture"].(map[string]interface{}); ok {
			updated := false
			if us, ok := arch["user_stories"].(string); ok && us != "" {
				architecture.UserStories = us
				updated = true
			}
			if dt, ok := arch["database_type"].(string); ok && dt != "" {
				architecture.DatabaseType = dt
				updated = true
			}
			if ds, ok := arch["database_schema"].(string); ok && ds != "" {
				architecture.DatabaseSchema = ds
				updated = true
			}
			if er, ok := arch["entities_relationships"].(string); ok && er != "" {
				architecture.EntitiesRelationships = er
				updated = true
			}
			if ts, ok := arch["tech_stack"].(string); ok && ts != "" {
				architecture.TechStack = ts
				updated = true
			}
			if ap, ok := arch["architecture_pattern"].(string); ok && ap != "" {
				architecture.ArchitecturePattern = ap
				updated = true
			}
			if sa, ok := arch["system_architecture"].(string); ok && sa != "" {
				architecture.SystemArchitecture = sa
				updated = true
			}
			if updated {
				if err := h.ArchitectureUsecase.UpdateArchitecture(ctx, architecture); err != nil {
					log.Printf("error updating architecture: %v", err)
				} else {
					affected = append(affected, "architecture")
				}
			}
		}
	}

	return affected
}

func writeJSON(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}
