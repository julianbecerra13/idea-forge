package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type contextKey string

const UserIDKey contextKey = "user_id"

// AuthMiddleware valida el JWT token
func AuthMiddleware(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Obtener token del header Authorization
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				respondError(w, http.StatusUnauthorized, "Token no proporcionado")
				return
			}

			// Formato esperado: "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				respondError(w, http.StatusUnauthorized, "Formato de token inválido")
				return
			}

			tokenString := parts[1]

			// Parsear y validar token
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				// Verificar método de firma
				if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(jwtSecret), nil
			})

			if err != nil {
				respondError(w, http.StatusUnauthorized, "Token inválido")
				return
			}

			if !token.Valid {
				respondError(w, http.StatusUnauthorized, "Token expirado o inválido")
				return
			}

			// Extraer claims
			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				respondError(w, http.StatusUnauthorized, "Claims inválidos")
				return
			}

			// Obtener user_id
			userIDStr, ok := claims["user_id"].(string)
			if !ok {
				respondError(w, http.StatusUnauthorized, "User ID no encontrado en token")
				return
			}

			userID, err := uuid.Parse(userIDStr)
			if err != nil {
				respondError(w, http.StatusUnauthorized, "User ID inválido")
				return
			}

			// Agregar user_id al contexto
			ctx := context.WithValue(r.Context(), UserIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserIDFromContext obtiene el user_id del contexto
func GetUserIDFromContext(ctx context.Context) (uuid.UUID, bool) {
	userID, ok := ctx.Value(UserIDKey).(uuid.UUID)
	return userID, ok
}

func respondError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
