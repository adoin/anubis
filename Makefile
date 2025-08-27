VERSION= $(shell cat ./VERSION)
GO?= go
NPM?= npm

.PHONY: build assets deps lint prebaked-build test

all: build

deps:
	$(NPM) ci
	$(GO) mod download

assets: PATH:=$(PWD)/node_modules/.bin:$(PATH)
assets: deps
	$(GO) generate ./...
ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -File ./web/build.ps1
	powershell -ExecutionPolicy Bypass -File ./xess/build.ps1
else
	./web/build.sh
	./xess/build.sh
endif

build: assets
	CGO_ENABLED=0 $(GO) build -o ./var/anubis -ldflags '-extldflags "-static"' ./cmd/anubis
	CGO_ENABLED=0 $(GO) build -o ./var/robots2policy -ldflags '-extldflags "-static"' ./cmd/robots2policy
	@echo "Anubis is now built to ./var/anubis"

lint: assets
	$(GO) vet ./...
	$(GO) tool staticcheck ./...
	$(GO) tool govulncheck ./...

prebaked-build:
	$(GO) build -o ./var/anubis -ldflags "-X 'github.com/TecharoHQ/anubis.Version=$(VERSION)'" ./cmd/anubis
	$(GO) build -o ./var/robots2policy -ldflags "-X 'github.com/TecharoHQ/anubis.Version=$(VERSION)'" ./cmd/robots2policy

test: assets
	$(GO) test ./...
