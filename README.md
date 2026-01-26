# arch CLI

Herramienta CLI para generar y mantener proyectos backend con Clean Architecture / Hexagonal / DDD.

arch te permite levantar un backend en minutos con muy poco codigo: crea la estructura, el wiring y los stubs correctos, y te deja solo la logica de negocio. No impone librerias: policy estricta (capas y dependencias) + mechanism libre (tu eliges frameworks, drivers y SDKs).

## Por que existe

- Evita mega-folders y el caos cuando el proyecto crece.
- Fuerza una arquitectura limpia sin bloquear tu stack.
- Convierte la arquitectura en un proceso determinista: mismo input, mismo output.
- Escala de mono-modulo a multi-modulo y submodulos sin reescribir todo.

## Resultado en minutos

Con 3-5 comandos tienes:
- estructura Clean/Hexagonal completa
- rutas HTTP y wiring global
- casos de uso + DTOs
- puertos e adapters
- checks arquitectonicos y plan de cambios

## Quick start

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
    domain/            # reglas, servicios, value objects
    application/       # use_cases, dtos, ports, services
    infrastructure/    # adapters, services
    delivery/          # routes
    bootstrap/         # container + settings

delivery/http/app.py   # composition root global
```

## Donde va cada cosa

- Validacion de entrada: delivery + DTOs
- Reglas de negocio: domain/rules, domain/services, domain/value_objects
- Orquestacion e IO: application/use_cases + ports
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
- Evita carpetas gigantes. Cada modulo mantiene su propio wiring y capas.

### Casos de uso en segundos

```
arch add use-case identity.auth.change_password
```
- Crea use case + DTOs + route + test stub + wiring.
- Solo completas la logica del caso de uso.

### Puertos y adapters (DIP real)

```
arch add port identity.auth.user_repository --methods "get_user(id); save(user)"
arch bind identity.auth.user_repository --to sql_user_repository
```
- Define interfaces arriba (ports) y adapters abajo.
- Wiring aislado y regenerable.

### Logica reusable (no todo es use case)

```
arch add service identity.password_policy --layer domain
arch add policy identity.password_policy
arch add engine identity.ranking_engine
```
- Services/policies/engines como artefactos de primera clase.

### Capabilities sin encerrar librerias

```
arch add capability db_postgres --module identity --for user_repository
arch add capability redis --module identity --for cache_port
arch add capability ffmpeg --module media --for transcoder
```
- Agrega adapters, settings, env y compose snippets.
- No impone frameworks: solo wiring y stubs.

### Refactor split asistido

```
arch refactor split identity --into auth,users --by prefix
```
- Mueve archivos por convencion, actualiza IR y wiring.
- Sin magia peligrosa: si algo falla, doctor lo muestra.

### Doctor y fix

```
arch doctor
arch fix wiring
```
- Detecta violaciones de capas, wiring incompleto, drift, thresholds.
- Regenera wiring sin tocar tu logica.

### Plan (dry run)

```
arch plan add use-case identity.auth.reset_password
```
- Muestra exactamente que archivos se crean/modifican antes de aplicar.

## Flujo tipico para crear un backend en minutos

1) `arch init`
2) `arch add use-case ...`
3) `arch add port ...` + `arch bind ...`
4) `arch add capability ...`
5) `arch doctor`

Con esto tienes:
- endpoints listos
- estructura limpia
- wiring estable
- integraciones stub con IO real

## Sin lock-in

arch no limita tus librerias. Solo impone una arquitectura limpia:
- Domain no depende de Infrastructure/Delivery
- Application no depende de Delivery/Infrastructure
- Adapters pueden usar cualquier SDK o driver

## Ops y trazabilidad

Cada comando se registra en `.arch/ops/` como una operacion.
Esto permite auditar cambios y planear refactors con seguridad.

## Cuando crear submodulos

Doctor avisa cuando:
- una carpeta tiene demasiados archivos
- un archivo crece demasiado

Eso indica que es momento de dividir por submodulos.

## En resumen

arch te deja:
- construir un backend serio en minutos
- crecer sin reescribir la arquitectura
- mantener DIP/SOLID con checks automaticos
- incorporar capacidades reales sin ensuciar el core

Si quieres un flujo guiado, usa `arch plan` y luego ejecuta el comando real.
