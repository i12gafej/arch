# arch CLI

Deterministic scaffolding tool for Clean Architecture modules.

## Quick start

```bash
node bin/arch.js init --name my_service --dir ./my_service
cd my_service
node ..\bin\arch.js add use-case my_service.change_password
node ..\bin\arch.js add port my_service.user_repository --methods "get_user(id); save(user)"
node ..\bin\arch.js bind my_service.user_repository --to sql_user_repository
node ..\bin\arch.js add service my_service.password_policy --layer domain
node ..\bin\arch.js add capability db_postgres --module my_service --for user_repository
node ..\bin\arch.js doctor
```

## Plan mode

```bash
node ..\bin\arch.js plan add use-case my_service.change_password
```
