package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"

	"github.com/contactos/executor/internal/engine"
	"github.com/contactos/executor/internal/worker"
)

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		log.Fatalf("missing required env %s", key)
	}
	return v
}

func main() {
	mode := flag.String("mode", "serve", "serve|run")
	executionID := flag.String("execution_id", "", "execution id for mode=run")
	workerID := flag.String("worker_id", "", "worker identifier (optional)")
	poll := flag.Duration("poll", 1*time.Second, "poll interval for serve loop")
	flag.Parse()

	dsn := mustEnv("DATABASE_URL")
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	defer db.Close()

	ctx := context.Background()

	switch *mode {
	case "serve":
		id := *workerID
		if id == "" {
			host, _ := os.Hostname()
			id = fmt.Sprintf("%s-%d", host, time.Now().Unix())
		}
		log.Printf("executor serve starting worker_id=%s poll=%s", id, poll.String())
		if err := worker.Serve(ctx, db, id, *poll); err != nil {
			log.Fatalf("serve error: %v", err)
		}
	case "run":
		if *executionID == "" {
			log.Fatalf("mode=run requires -execution_id")
		}
		req, err := worker.LoadRequest(ctx, db, *executionID)
		if err != nil {
			log.Fatalf("load request: %v", err)
		}
		if err := engine.RunExecution(ctx, db, *executionID, req); err != nil {
			log.Fatalf("run execution failed: %v", err)
		}
	default:
		log.Fatalf("unknown mode: %s", *mode)
	}
}
