BINARY_NAME=bookstore-api
BUILD_DIR=./bin
MIGRATE=migrate
SQLC=sqlc
SWAG=swag

POSTGRES_DSN?=postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@$(POSTGRES_HOST):$(POSTGRES_PORT)/$(POSTGRES_DB)?sslmode=disable
MIGRATIONS_DIR=db/postgres/migrations

.PHONY: all build run dev clean tidy \
        migrate-up migrate-down migrate-create sqlc-generate swagger-gen \
        db-start db-stop db-init-pg db-admin-pg db-init-mongo db-init-neo4j db-init-redis

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
	@echo "Waiting for databases to be ready..."
	@sleep 5

db-stop:
	docker-compose down

db-logs:
	docker-compose logs -f postgres mongo neo4j redis

db-init-pg:
	@echo "Applying PostgreSQL migrations..."
	$(MIGRATE) -source file://$(MIGRATIONS_DIR) \
	  -database "postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:5432/$(POSTGRES_DB)?sslmode=disable" \
	  up

db-admin-pg:
	@echo "Creating bookstore_admin role in PostgreSQL..."
	psql "postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@localhost:5432/$(POSTGRES_DB)?sslmode=disable" \
	  -c "DO \$\$ BEGIN \
	        IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'bookstore_admin') THEN \
	          CREATE ROLE bookstore_admin WITH LOGIN PASSWORD 'bookstore_admin'; \
	        END IF; \
	      END \$\$;"

db-init-mongo:
	@echo "Creating MongoDB collections and indexes..."
	mongosh "mongodb://$(MONGO_USER):$(MONGO_PASSWORD)@localhost:27017/$(MONGO_DB)?authSource=admin" \
	  --eval "db.createCollection('books'); db.createCollection('categories');"

db-init-neo4j:
	@echo "Applying Neo4j graph constraints..."
	cypher-shell -u "$(NEO4J_USER)" -p "$(NEO4J_PASSWORD)" \
	  -f db/neo4j/migrations/202604231400_init_graph_constraints.up.cypher
	cypher-shell -u "$(NEO4J_USER)" -p "$(NEO4J_PASSWORD)" \
	  -f db/neo4j/migrations/202604281400_update_graph_relationships.up.cypher

db-init-redis:
	@echo "Pinging Redis..."
	redis-cli -a "$(REDIS_PASSWORD)" PING

## ── Cleanup ──────────────────────────────────────────────────────────────────

clean:
	rm -rf $(BUILD_DIR)
