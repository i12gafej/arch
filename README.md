````md
# arch CLI

CLI tool to generate and maintain backend projects with Clean Architecture / Hexagonal / DDD.

**arch** spins up a backend in minutes with minimal code: it scaffolds the structure, wiring, and correct stubs—leaving you only the business logic. It does **not** impose libraries: **strict policy** (layers + dependencies) + **free mechanism** (you choose frameworks, drivers, SDKs, binaries).

---

## Why this exists

As backend projects grow, structure tends to decay:
- horizontal mega-folders (`use_cases/`, `dtos/`, `services/` with hundreds of files)
- dependency leaks (domain importing infra, use cases importing web)
- wiring scattered across the codebase
- refactors that become risky and slow

**arch** solves that by making architecture **deterministic** and **maintained by tooling**:
- same input → same output
- scalable filesystem layout (mono-module → multi-module → submodules)
- architecture checks + safe wiring regeneration
- growth and refactors without rewriting everything

---

## What you get in minutes

With 3–5 commands you get:
- full Clean/Hexagonal project skeleton
- HTTP routes + global wiring
- use cases + DTOs
- ports + adapters (real DIP)
- architectural checks and a dry-run plan

---

## What YOU still implement

arch generates **structure and extension points**, not your product logic. You will implement:
- business rules (domain rules/value objects/services)
- use case logic (`execute()` bodies)
- adapter internals (DB calls, SDK calls, FFmpeg wrappers, etc.)
- real validation details (DTO constraints) and tests beyond stubs

---

## Quick start

```bash
node bin/arch.js init --name my_service --dir ./my_service
cd my_service
node ../bin/arch.js add use-case my_service.change_password
node ../bin/arch.js add port my_service.user_repository --methods "get_user(id); save(user)"
node ../bin/arch.js bind my_service.user_repository --to sql_user_repository
node ../bin/arch.js doctor
````

---

## Scalable structure (Vertical Slices)

arch supports 3 levels:

* mono-module start
* multiple modules
* submodules inside a module

Base layout:

```text
modules/
  <module>/
    domain/            # rules, services, value objects
    application/       # use_cases, dtos, ports, services
    infrastructure/    # adapters, services
    delivery/          # routes
    bootstrap/         # container + settings

delivery/http/app.py   # global composition root
```

---

## Where things go

* Input validation: `delivery/*` + `application/dtos/*`
* Business rules: `domain/rules/*`, `domain/services/*`, `domain/value_objects/*`
* Orchestration + IO boundaries: `application/use_cases/*` + `application/ports/*`
* Real integrations: `infrastructure/adapters/*`

---

## Commands

### Create a project

```bash
arch init --name my_service --dir ./my_service
```

Generates: full structure, global wiring, health endpoint, settings, env placeholders, compose placeholders.

### Grow by modules

```bash
arch add module billing
arch add submodule billing.invoices
```

Avoids giant folders. Each module keeps its own layers + container.

### Create use cases fast

```bash
arch add use-case identity.auth.change_password
```

Generates: use case + DTOs + route + test stub + wiring.
You only fill in the use case logic.

### Ports & adapters (real DIP)

```bash
arch add port identity.auth.user_repository --methods "get_user(id); save(user)"
arch bind identity.auth.user_repository --to sql_user_repository
```

Interfaces live “up” (ports), implementations live “down” (adapters). Wiring is isolated and regenerable.

### Reusable logic (not everything is a use case)

```bash
arch add service identity.password_policy --layer domain
arch add policy identity.password_policy
arch add engine identity.ranking_engine
```

Services/policies/engines as first-class artifacts for algorithms, policies, preprocessing, pagination, ranking, etc.

### Capabilities without lock-in

```bash
arch add capability db_postgres --module identity --for user_repository
arch add capability redis --module identity --for cache_port
arch add capability ffmpeg --module media --for transcoder
```

Adds adapters, settings, env, compose snippets, and doctor checks.
No framework lock-in—only structure + wiring + stubs.

### Assisted refactor split

```bash
arch refactor split identity --into auth,users --by prefix
```

Moves files by convention, updates IR + wiring. No risky magic: if something breaks, `doctor` shows it.

### Doctor & fix

```bash
arch doctor
arch fix wiring
```

Detects: layer violations, incomplete wiring, marker drift, thresholds.
Regenerates wiring without touching your business logic.

### Plan (dry run)

```bash
arch plan add use-case identity.auth.reset_password
```

Shows exactly what will change before applying.

---

## Typical flow: backend in minutes

1. `arch init`
2. `arch add use-case ...`
3. `arch add port ...` + `arch bind ...`
4. `arch add capability ...`
5. `arch doctor`

Result:

* endpoints scaffolded
* clean structure
* stable wiring
* integrations stubbed cleanly (ready for real IO)

---

## No lock-in

arch does not limit your libraries. It only enforces clean architecture:

* Domain must not depend on Infrastructure/Delivery
* Application must not depend on Delivery/Infrastructure
* Adapters may use any SDK/driver/binary

---

## Ops & traceability

Every command is recorded under `.arch/ops/` as an operation.
This makes changes auditable and refactors safer.

---

## When to create submodules

Doctor warns when:

* a folder has too many files
* a file grows too large

That’s your signal to split into submodules.

---

# arch CLI (ES)

Herramienta CLI para generar y mantener proyectos backend con Clean Architecture / Hexagonal / DDD.

**arch** levanta un backend en minutos con muy poco código: crea la estructura, el wiring y los stubs correctos, y te deja solo la lógica de negocio. No impone librerías: **policy estricta** (capas y dependencias) + **mechanism libre** (tú eliges frameworks, drivers, SDKs, binarios).

---

## Por qué existe

Cuando un backend crece, la estructura suele degradarse:

* mega-folders horizontales (`use_cases/`, `dtos/`, `services/` con cientos de archivos)
* fugas de dependencias (dominio importando infra, casos de uso importando web)
* wiring repartido por todo el repositorio
* refactors lentos y arriesgados

**arch** lo resuelve convirtiendo la arquitectura en un proceso **determinista** y **mantenible por tooling**:

* mismo input → mismo output
* layout escalable (mono-módulo → multi-módulo → submódulos)
* checks arquitectónicos + regeneración segura de wiring
* crecer y refactorizar sin reescribirlo todo

---

## Resultado en minutos

Con 3–5 comandos tienes:

* estructura Clean/Hexagonal completa
* rutas HTTP y wiring global
* casos de uso + DTOs
* puertos y adapters (DIP real)
* checks arquitectónicos y plan de cambios (dry run)

---

## Qué te queda por implementar a ti

arch genera **estructura y puntos de extensión**, no tu producto. Tú implementas:

* reglas de negocio (rules/value objects/services en dominio)
* lógica de casos de uso (`execute()`)
* internals de adapters (DB, SDKs, wrappers FFmpeg, etc.)
* validaciones reales en DTOs y tests más allá del stub

---

## Quick start

```bash
node bin/arch.js init --name my_service --dir ./my_service
cd my_service
node ../bin/arch.js add use-case my_service.change_password
node ../bin/arch.js add port my_service.user_repository --methods "get_user(id); save(user)"
node ../bin/arch.js bind my_service.user_repository --to sql_user_repository
node ../bin/arch.js doctor
```

---

## Estructura escalable (Vertical Slices)

arch soporta 3 niveles:

* mono-módulo inicial
* múltiples módulos
* submódulos dentro de un módulo

Layout base:

```text
modules/
  <module>/
    domain/            # reglas, servicios, value objects
    application/       # use_cases, dtos, ports, services
    infrastructure/    # adapters, services
    delivery/          # routes
    bootstrap/         # container + settings

delivery/http/app.py   # composition root global
```

---

## Dónde va cada cosa

* Validación de entrada: `delivery/*` + `application/dtos/*`
* Reglas de negocio: `domain/rules/*`, `domain/services/*`, `domain/value_objects/*`
* Orquestación y límites de IO: `application/use_cases/*` + `application/ports/*`
* Integraciones reales: `infrastructure/adapters/*`

---

## Comandos

### Crear proyecto

```bash
arch init --name my_service --dir ./my_service
```

Genera: estructura completa, wiring global, health endpoint, settings, env placeholders, compose placeholders.

### Crecer por módulos

```bash
arch add module billing
arch add submodule billing.invoices
```

Evita carpetas gigantes. Cada módulo conserva capas y su container.

### Casos de uso en segundos

```bash
arch add use-case identity.auth.change_password
```

Crea: use case + DTOs + route + test stub + wiring.
Solo completas la lógica del caso de uso.

### Puertos y adapters (DIP real)

```bash
arch add port identity.auth.user_repository --methods "get_user(id); save(user)"
arch bind identity.auth.user_repository --to sql_user_repository
```

Interfaces arriba (ports) e implementaciones abajo (adapters). Wiring aislado y regenerable.

### Lógica reusable (no todo es caso de uso)

```bash
arch add service identity.password_policy --layer domain
arch add policy identity.password_policy
arch add engine identity.ranking_engine
```

Services/policies/engines como artefactos de primera clase para algoritmos, políticas, preprocesado, paginación, ranking, etc.

### Capabilities sin encerrar librerías

```bash
arch add capability db_postgres --module identity --for user_repository
arch add capability redis --module identity --for cache_port
arch add capability ffmpeg --module media --for transcoder
```

Agrega adapters, settings, env, compose snippets y checks.
No impone frameworks: solo estructura, wiring y stubs.

### Refactor split asistido

```bash
arch refactor split identity --into auth,users --by prefix
```

Mueve archivos por convención, actualiza IR y wiring. Sin magia peligrosa: si algo falla, `doctor` lo muestra.

### Doctor y fix

```bash
arch doctor
arch fix wiring
```

Detecta violaciones de capas, wiring incompleto, drift de markers y thresholds.
Regenera wiring sin tocar tu lógica.

### Plan (dry run)

```bash
arch plan add use-case identity.auth.reset_password
```

Muestra exactamente qué se crea/modifica antes de aplicar.

---

## Flujo típico: backend en minutos

1. `arch init`
2. `arch add use-case ...`
3. `arch add port ...` + `arch bind ...`
4. `arch add capability ...`
5. `arch doctor`

Resultado:

* endpoints scaffoldeados
* estructura limpia
* wiring estable
* integraciones preparadas (listas para IO real)

---

## Sin lock-in

arch no limita tus librerías. Solo impone arquitectura limpia:

* Domain no depende de Infrastructure/Delivery
* Application no depende de Delivery/Infrastructure
* Adapters pueden usar cualquier SDK/driver/binario

---

## Ops y trazabilidad

Cada comando queda registrado en `.arch/ops/` como una operación.
Esto permite auditar cambios y planear refactors con seguridad.

---

## Cuándo crear submódulos

Doctor avisa cuando:

* una carpeta tiene demasiados archivos
* un archivo crece demasiado

Eso indica que es momento de dividir por submódulos.

```
```
