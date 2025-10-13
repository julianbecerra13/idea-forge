package main

import (
	"log"
	"net/http"
	"os"
	"time"

	"github.com/joho/godotenv"

	appdb "github.com/dark/idea-forge/internal/db"
	ideationpg "github.com/dark/idea-forge/internal/ideation/adapter/pg"
	ideationhttp "github.com/dark/idea-forge/internal/ideation/adapter/http"
	ideationuc "github.com/dark/idea-forge/internal/ideation/usecase"
)

func main() {
	_ = godotenv.Load()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL no está definido")
	}

	sqlDB, err := appdb.OpenPostgres(dsn)
	if err != nil {
		log.Fatalf("error abriendo DB: %v", err)
	}
	defer sqlDB.Close()

	repo := ideationpg.NewRepo(sqlDB)
	create := ideationuc.NewCreateIdea(repo)
	get := ideationuc.NewGetIdea(repo)
	list := ideationuc.NewListIdeas(repo)
	update := ideationuc.NewUpdateIdea(repo)
	appendMsg := ideationuc.NewAppendMessage(repo)

	mux := http.NewServeMux()
	handlers := &ideationhttp.Handlers{Create: create, Get: get, List: list, Update: update, Append: appendMsg}
	handlers.Register(mux)

	srv := &http.Server{
		Addr:              ":8080",
		Handler:           cors(security(mux)),
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Println("API listening on :8080")
	log.Fatal(srv.ListenAndServe())
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Permitir peticiones desde el frontend (múltiples puertos)
		origin := r.Header.Get("Origin")
		if origin == "http://localhost:3000" || origin == "http://localhost:3002" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")

		// Manejar preflight request
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func security(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		next.ServeHTTP(w, r)
	})
}
