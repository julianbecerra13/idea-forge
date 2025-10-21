package http

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/dark/idea-forge/internal/auth/domain"
	"github.com/dark/idea-forge/internal/auth/port"
	"github.com/dark/idea-forge/internal/auth/usecase"
	"github.com/dark/idea-forge/internal/middleware"
)

type AuthHandler struct {
	registerUC       *usecase.RegisterUseCase
	verifyEmailUC    *usecase.VerifyEmailUseCase
	loginUC          *usecase.LoginUseCase
	forgotPasswordUC *usecase.ForgotPasswordUseCase
	resetPasswordUC  *usecase.ResetPasswordUseCase
	userRepo         port.UserRepository
	emailService     port.EmailService
}

func NewAuthHandler(
	registerUC *usecase.RegisterUseCase,
	verifyEmailUC *usecase.VerifyEmailUseCase,
	loginUC *usecase.LoginUseCase,
	forgotPasswordUC *usecase.ForgotPasswordUseCase,
	resetPasswordUC *usecase.ResetPasswordUseCase,
	userRepo port.UserRepository,
	emailService port.EmailService,
) *AuthHandler {
	return &AuthHandler{
		registerUC:       registerUC,
		verifyEmailUC:    verifyEmailUC,
		loginUC:          loginUC,
		forgotPasswordUC: forgotPasswordUC,
		resetPasswordUC:  resetPasswordUC,
		userRepo:         userRepo,
		emailService:     emailService,
	}
}

// Register maneja el registro de usuarios
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var input usecase.RegisterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	user, err := h.registerUC.Execute(r.Context(), input)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err == domain.ErrEmailAlreadyExists || err == domain.ErrUsernameAlreadyExists {
			statusCode = http.StatusConflict
		} else if err == domain.ErrInvalidEmail || err == domain.ErrWeakPassword ||
			err == domain.ErrPasswordMismatch || err == domain.ErrInvalidUsername {
			statusCode = http.StatusBadRequest
		}
		respondError(w, statusCode, err.Error())
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"message": "Usuario registrado exitosamente. Revisa tu email para verificar tu cuenta.",
		"user_id": user.ID,
		"email":   user.Email,
	})
}

// VerifyEmail maneja la verificación de email
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var input usecase.VerifyEmailInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	if err := h.verifyEmailUC.Execute(r.Context(), input); err != nil {
		statusCode := http.StatusBadRequest
		if err == domain.ErrInvalidVerificationCode {
			statusCode = http.StatusNotFound
		} else if err == domain.ErrExpiredVerificationCode || err == domain.ErrCodeAlreadyUsed {
			statusCode = http.StatusGone
		}
		respondError(w, statusCode, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"message": "Email verificado exitosamente",
	})
}

// ResendCode reenvía el código de verificación
func (h *AuthHandler) ResendCode(w http.ResponseWriter, r *http.Request) {
	var input struct {
		UserID uuid.UUID `json:"user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	if err := h.verifyEmailUC.ResendVerificationCode(r.Context(), input.UserID, h.emailService); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"message": "Código reenviado exitosamente",
	})
}

// Login maneja el inicio de sesión
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var input usecase.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	output, err := h.loginUC.Execute(r.Context(), input)
	if err != nil {
		statusCode := http.StatusUnauthorized
		if err == domain.ErrUserNotVerified {
			// Obtener user_id para permitir reenvío de código
			var user *domain.User
			if validateEmail(input.EmailOrUsername) == nil {
				user, _ = h.userRepo.GetUserByEmail(r.Context(), input.EmailOrUsername)
			} else {
				user, _ = h.userRepo.GetUserByUsername(r.Context(), input.EmailOrUsername)
			}

			respondJSON(w, http.StatusForbidden, map[string]interface{}{
				"error":   err.Error(),
				"user_id": user.ID,
				"message": "Por favor verifica tu email antes de iniciar sesión",
			})
			return
		}
		respondError(w, statusCode, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, output)
}

// ForgotPassword maneja la solicitud de recuperación de contraseña
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var input usecase.ForgotPasswordInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	if err := h.forgotPasswordUC.Execute(r.Context(), input); err != nil {
		respondError(w, http.StatusInternalServerError, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"message": "Si el email existe, recibirás un link para recuperar tu contraseña",
	})
}

// ResetPassword maneja el cambio de contraseña
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var input usecase.ResetPasswordInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		respondError(w, http.StatusBadRequest, "Datos inválidos")
		return
	}

	if err := h.resetPasswordUC.Execute(r.Context(), input); err != nil {
		statusCode := http.StatusBadRequest
		if err == domain.ErrInvalidResetToken {
			statusCode = http.StatusNotFound
		} else if err == domain.ErrExpiredResetToken || err == domain.ErrTokenAlreadyUsed {
			statusCode = http.StatusGone
		}
		respondError(w, statusCode, err.Error())
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"message": "Contraseña actualizada exitosamente",
	})
}

// GetMe obtiene el usuario actual (requiere autenticación)
func (h *AuthHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID, ok := middleware.GetUserIDFromContext(r.Context())
	if !ok {
		respondError(w, http.StatusUnauthorized, "Usuario no autenticado")
		return
	}

	user, err := h.userRepo.GetUserByID(r.Context(), userID)
	if err != nil {
		respondError(w, http.StatusNotFound, "Usuario no encontrado")
		return
	}

	respondJSON(w, http.StatusOK, user)
}

// Helper functions
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func validateEmail(email string) error {
	// Simple validation
	if len(email) < 3 || !contains(email, "@") {
		return domain.ErrInvalidEmail
	}
	return nil
}

func contains(s, substr string) bool {
	for i := 0; i < len(s); i++ {
		if s[i] == substr[0] {
			return true
		}
	}
	return false
}
