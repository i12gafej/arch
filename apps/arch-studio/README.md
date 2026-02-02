# Arch Studio (Desktop-first)

Visual Architecture Compiler for Clean Architecture / Hexagonal / DDD.

This app does not edit code. It lets you design architecture first (domain -> application -> boundary -> infrastructure), validates legal relationships, and generates plan/doctor outputs from the graph.

## Layer responsibilities
- `domain`: graph language + architecture rules (no React, no persistence)
- `application`: use-cases and orchestration (depends on ports, not UI/store internals)
- `infrastructure`: adapters (store gateway, arch-core adapter, persistence, workspace stubs)
- `presentation`: blackboard UI, node palette, inspector, topbar, styles

## Design model
- Domain problem: `entity`, `value_object`, `domain_interface`, `domain_service`
- Application: `use_case`, `application_service`
- Boundary: `port`
- Infrastructure: `adapter`, `capability`, `persistence_model`
- Delivery: `api_surface`
- Structure: `service`, `module`, `submodule`

## Guided flow (MVP)
1. Select module/submodule.
2. Use **Domain Slice (guided)** to scaffold a complete vertical slice from domain to port.
3. Add adapters/capabilities to close the infrastructure side.
4. Run Plan / Doctor and export/import snapshots.
