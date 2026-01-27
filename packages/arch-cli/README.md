# arch CLI

arch es una herramienta CLI para generar y mantener backends con Clean Architecture / Hexagonal / DDD.

La idea: crear un sistema backend en minutos con muy poco codigo. arch crea la estructura, el wiring y los stubs correctos, y tu solo completas la logica de negocio. No impone librerias: policy estricta (capas y dependencias) + mechanism libre (elige frameworks, SDKs y drivers).

## Potencialidad en una frase

Arquitectura limpia, determinista y escalable desde el minuto 1: mismo input -> misma estructura, sin mega-folders.

## Quick start (backend en minutos)

```bash
node bin/arch.js init --name my_service --dir ./my_service
cd my_service
node ..\bin\arch.js add use-case my_service.change_password
node ..\bin\arch.js add port my_service.user_repository --methods "get_user(id); save(user)"
node ..\bin\arch.js bind my_service.user_repository --to sql_user_repository
node ..\bin\arch.js doctor
```

## Estructura escalable (vertical slices)

arch soporta 3 niveles:
- mono-modulo inicial
- multiples modulos
- submodulos dentro de un modulo

Layout base:

```
modules/
  <module>/
    domain/
      interfaces/      # policies/strategies/specs
      rules/
      services/
      entities/
      value_objects/
    application/
      use_cases/
      dtos/
      ports/
      services/
      mappers/
    infrastructure/
      adapters/
      services/
      db/sqlalchemy/models/
      db/sqlalchemy/mappers/
    delivery/
      http/routes/
      http/router.py
    bootstrap/
      container.py
      settings.py

delivery/http/app.py   # composition root global
```

## Domain Interfaces vs Ports (clave)

- Domain Interfaces (policies/strategies/specs/selectors)
  - Viven en `domain/interfaces/`
  - Son contratos de dominio puro
  - Implementaciones puras en `domain/services/` o `domain/rules/`
  - No usan DI

- Ports (System Interfaces)
  - Viven en `application/ports/`
  - Contratos hacia dependencias externas
  - Implementaciones en `infrastructure/adapters/`
  - Si usan DI y bindings en container

## Donde va cada cosa

- Validacion de entrada: delivery + DTOs
- Reglas de negocio: domain/rules + domain/interfaces + domain/services
- Orquestacion/IO: application/use_cases + ports
- Integraciones reales: infrastructure/adapters

## Comandos y potencialidad

### Crear proyecto

```
arch init --name my_service --dir ./my_service
```
- Genera estructura completa, wiring global, health endpoint, settings, env y compose placeholders.

### Crecer por modulos

```
arch add module billing
arch add submodule billing.invoices
```
- Evita carpetas gigantes. Cada modulo mantiene sus capas.

### API incremental

```
arch add api http --module identity --mount /identity
```
- Crea router por modulo y lo registra en el app global.

### Casos de uso en segundos

```
arch add use-case identity.auth.change_password
```
- Crea use case + DTOs + route + test stub + wiring.
- Solo completas la logica del caso de uso.

### Domain Interfaces / Services

```
arch add domain-interface identity.auth.password_policy --kind policy
arch add domain-service identity.auth.default_password_policy --implements password_policy
```

### App Services (logica reusable de orquestacion)

```
arch add app-service identity.auth.password_normalizer --uses user_repository
```

### Puertos y adapters (DIP real)

```
arch add port identity.auth.user_repository --methods "get_user(id); save(user)"
arch bind identity.auth.user_repository --to sql_user_repository
```

### Capabilities sin encerrar librerias

```
arch add capability db_postgres --module identity --for user_repository
arch add capability redis --module identity --for cache_port
arch add capability ffmpeg --module media --for transcoder
arch add capability trackql_graphql --module gateway --for content_service
```
- Agrega adapters, settings, env y compose snippets.
- No impone frameworks: solo wiring y stubs.

### Refactor split asistido

```
arch refactor split identity --into auth,users --by prefix
```
- Mueve archivos por convencion, actualiza IR y wiring.

### Modelos y mappers

```
arch add model identity.auth.User --kind entity --fields "id:int, email:str"
arch add dto identity.auth.ChangePasswordRequest --fields "user_id:int, password:str"
arch add persistence-model identity.auth.User --orm sqlalchemy --table users --fields "id:int, email:str" --fk "users.account_id -> accounts.id"
arch add mapper identity.auth.user_mapper --from dto --to domain
```

## Modelos: Domain vs DTO vs ORM

- Domain models: `domain/entities` y `domain/value_objects`
- DTOs: `application/dtos` (frontera API)
- ORM models: `infrastructure/db/sqlalchemy/models` (tablas/FKs)
- Mappers:
  - DTO -> Domain: `application/mappers`
  - ORM -> Domain: `infrastructure/db/sqlalchemy/mappers`

## Graph DSL (graph -> IR -> plan)

```
module identity
submodule identity.auth
api http identity mount /identity
use_case identity.auth.change_password
policy identity.auth.password_policy
port identity.auth.user_repository
adapter identity.auth.sql_user_repository for identity.auth.user_repository
capability identity db_postgres for identity.auth.user_repository
```

Comandos:
```
arch graph plan ./architecture.graph
arch graph apply ./architecture.graph
```

## Doctor y fix

```
arch doctor
arch fix wiring
```
- Detecta violaciones de capas, wiring incompleto, drift, thresholds.
- Regenera wiring sin tocar tu logica.

## Plan (dry run)

```
arch plan add use-case identity.auth.reset_password
```
- Muestra exactamente que archivos se crean/modifican antes de aplicar.

## En resumen

arch te deja:
- construir un backend serio en minutos
- crecer sin reescribir la arquitectura
- mantener DIP/SOLID con checks automaticos
- incorporar capacidades reales sin ensuciar el core

Si quieres un flujo guiado, usa `arch plan` y luego ejecuta el comando real.
