# Arch Studio (Desktop-first)

Visual Architecture Compiler for Clean Architecture / Hexagonal / DDD.

This app does not edit code. It builds an architecture graph, validates it via arch-core, compiles to IR + plan, and applies via workspace adapters.

Folders:
- presentation: UI (React + canvas)
- application: UI use-cases (CreateNode, ConnectNodes, CompileGraph, ApplyPlan)
- domain: graph model for the UI state
- infrastructure: adapters (workspace, templates, filesystem)

MVP goal:
- Build nodes/edges with legal constraints
- Compile graph -> AST -> IR -> Plan
- Apply plan to filesystem
- Run doctor
