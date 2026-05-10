BINARY_NAME=bookstore-api
BUILD_DIR=./bin
MIGRATE=migrate
SQLC=sqlc
SWAG=swag

# Load environment variables from .env file
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

POSTGRES_DSN?=postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(POSTGRES_HOST):$(POSTGRES_PORT)/$(POSTGRES_DB)?sslmode=disable
MIGRATIONS_DIR=db/postgres/migrations

.PHONY: all build run dev clean tidy \
        migrate-up migrate-down migrate-create sqlc-generate swagger-gen \
        db-start db-stop db-delete db-init-pg db-admin-pg db-init-mongo db-init-neo4j db-init-redis

all: build

## ── Build & run ───────────────────────────────────────────────────────────────

build:
	@mkdir -p $(BUILD_DIR)
	go build -o $(BUILD_DIR)/$(BINARY_NAME) ./main.go

run:
	go run ./main.go server

dev:
	air

tidy:
	go mod tidy

## ── Database migrations ──────────────────────────────────────────────────────

migrate-up:
	$(MIGRATE) -source file://$(MIGRATIONS_DIR) -database "$(POSTGRES_DSN)" up

migrate-down:
	$(MIGRATE) -source file://$(MIGRATIONS_DIR) -database "$(POSTGRES_DSN)" down 1

migrate-create:
	$(MIGRATE) create -ext sql -dir $(MIGRATIONS_DIR) -seq $(NAME)

## ── sqlc / swagger ───────────────────────────────────────────────────────────

sqlc-generate:
	cd db/postgres && $(SQLC) generate

swagger-gen:
	$(SWAG) init -g main.go --output docs

## ── Docker database management ───────────────────────────────────────────────

db-start:
	docker-compose up -d postgres mongo neo4j redis
	@echo "Waiting for PostgreSQL to be ready (user + database initialised)..."
	@until docker exec bookstore_postgres psql \
	    -U "$(POSTGRES_USER)" -d "$(POSTGRES_DB)" \
	    -c "SELECT 1" > /dev/null 2>&1; do \
	    echo "  ...still waiting"; sleep 2; \
	done
	@echo "PostgreSQL is ready."
	@echo "Waiting for MongoDB to be ready..."
	@until docker exec bookstore_mongo mongosh \
	    -u "$(MONGO_USER)" -p "$(MONGO_PASSWORD)" \
	    --authenticationDatabase admin \
	    --eval "db.adminCommand('ping')" > /dev/null 2>&1; do \
	    echo "  ...still waiting"; sleep 2; \
	done
	@echo "MongoDB is ready."
	@echo "Waiting for Neo4j to be ready..."
	@until docker exec bookstore_neo4j cypher-shell \
	    -u "neo4j" -p "$(NEO4J_PASSWORD)" \
	    "RETURN 1" > /dev/null 2>&1; do \
	    echo "  ...still waiting"; sleep 3; \
	done
	@echo "Neo4j is ready."

# This command only stops all database containers without truly deleting their volumes or storages.
db-stop:
	docker-compose down

# This command stops all database containers and completely delete their volumes or storages through the "-v" argument (i.e., "-volume").
db-delete:
	docker-compose down -v

db-logs:
	docker-compose logs -f postgres mongo neo4j redis

db-init-pg:
	@echo "Applying PostgreSQL migrations..."
	$(MIGRATE) -source file://$(MIGRATIONS_DIR) \
	  -database "postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(POSTGRES_HOST):$(POSTGRES_PORT)/$(POSTGRES_DB)?sslmode=disable" \
	  up

db-admin-pg:
	@echo "Creating bookstore_admin role in PostgreSQL..."
	@docker exec bookstore_postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) \
	  -c "CREATE ROLE bookstore_admin WITH LOGIN PASSWORD 'bookstore_admin';" || echo "Role already exists, skipping creation..."
	@docker exec bookstore_postgres psql -U $(POSTGRES_USER) -d $(POSTGRES_DB) -c "GRANT ALL PRIVILEGES ON DATABASE $(POSTGRES_DB) TO bookstore_admin;"

db-init-mongo:
	@echo "MongoDB indexes will be managed by the application on startup."
	@echo "Pinging MongoDB..."
	@docker exec bookstore_mongo mongosh -u $(MONGO_USER) -p $(MONGO_PASSWORD) --authenticationDatabase admin --quiet --eval "db.adminCommand('ping')"

db-init-neo4j:
	@echo "Applying Neo4j graph constraints..."
	docker exec -i bookstore_neo4j cypher-shell \
	  -u "neo4j" -p "$(NEO4J_PASSWORD)" \
	  < db/neo4j/migrations/202605031400_init_schema.up.cypher

db-init-redis:
	@echo "Pinging Redis..."
	docker exec bookstore_redis redis-cli -a "$(REDIS_PASSWORD)" PING

db-seed:
	@echo "Running data generator (seeding)..."
	cd data_generator && go run main.go

db-seed-verification:
	@echo "Running data generator (verification)..."
	cd data_generator && go run main.go -verify

## ── Cleanup ──────────────────────────────────────────────────────────────────

clean:
	rm -rf $(BUILD_DIR)
