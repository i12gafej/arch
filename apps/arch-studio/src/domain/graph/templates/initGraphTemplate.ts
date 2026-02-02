import { createGraphEdge, createGraphNode } from "../factories.ts";
import { validateGraph } from "../validators.ts";
import { EdgeKinds } from "../edgeTypes.ts";

function buildId(kind, name) {
  return `${kind}:${name}`;
}

export function initGraphTemplate(templateId) {
  if (templateId && templateId !== "generic") {
    throw new Error(`Unknown template: ${templateId}`);
  }

  const nodes = [];
  const edges = [];

  function addNode({ kind, name, moduleId, submoduleId, metadata = {}, id }) {
    const node = createGraphNode({
      kind,
      name,
      moduleId,
      submoduleId,
      metadata,
      id: id || buildId(kind, name),
    });
    nodes.push(node);
    return node;
  }

  function addEdge({ source, target, kind }) {
    const edge = createGraphEdge({ source, target, kind });
    edges.push(edge);
    return edge;
  }

  const service = addNode({
    kind: "service",
    name: "demo_service",
  });

  const identityModule = addNode({
    kind: "module",
    name: "identity",
    metadata: { serviceId: "demo_service" },
  });
  const billingModule = addNode({
    kind: "module",
    name: "billing",
    metadata: { serviceId: "demo_service" },
  });

  addEdge({ source: service.id, target: identityModule.id, kind: EdgeKinds.contains });
  addEdge({ source: service.id, target: billingModule.id, kind: EdgeKinds.contains });

  const identityAuth = addNode({
    kind: "submodule",
    name: "auth",
    moduleId: "identity",
    id: buildId("submodule", "identity.auth"),
  });
  const identityUsers = addNode({
    kind: "submodule",
    name: "users",
    moduleId: "identity",
    id: buildId("submodule", "identity.users"),
  });
  const billingPayments = addNode({
    kind: "submodule",
    name: "payments",
    moduleId: "billing",
    id: buildId("submodule", "billing.payments"),
  });

  addEdge({ source: identityModule.id, target: identityAuth.id, kind: EdgeKinds.contains });
  addEdge({ source: identityModule.id, target: identityUsers.id, kind: EdgeKinds.contains });
  addEdge({ source: billingModule.id, target: billingPayments.id, kind: EdgeKinds.contains });

  const identityApi = addNode({
    kind: "api_surface",
    name: "http",
    moduleId: "identity",
    metadata: { mount: "/identity" },
    id: buildId("api_surface", "identity.http"),
  });
  const billingApi = addNode({
    kind: "api_surface",
    name: "http",
    moduleId: "billing",
    metadata: { mount: "/billing" },
    id: buildId("api_surface", "billing.http"),
  });

  addEdge({ source: identityModule.id, target: identityApi.id, kind: EdgeKinds.exposes });
  addEdge({ source: billingModule.id, target: billingApi.id, kind: EdgeKinds.exposes });

  const changePassword = addNode({
    kind: "use_case",
    name: "change_password",
    moduleId: "identity",
    submoduleId: "auth",
    metadata: { route: "/users/{id}/password" },
    id: buildId("use_case", "identity.auth.change_password"),
  });
  const refreshSession = addNode({
    kind: "use_case",
    name: "refresh_session",
    moduleId: "identity",
    submoduleId: "auth",
    metadata: { route: "/sessions/refresh" },
    id: buildId("use_case", "identity.auth.refresh_session"),
  });
  const createUser = addNode({
    kind: "use_case",
    name: "create_user",
    moduleId: "identity",
    submoduleId: "users",
    metadata: { route: "/users" },
    id: buildId("use_case", "identity.users.create_user"),
  });
  const chargeCard = addNode({
    kind: "use_case",
    name: "charge_card",
    moduleId: "billing",
    submoduleId: "payments",
    metadata: { route: "/payments/charge" },
    id: buildId("use_case", "billing.payments.charge_card"),
  });

  addEdge({ source: identityAuth.id, target: changePassword.id, kind: EdgeKinds.contains });
  addEdge({ source: identityAuth.id, target: refreshSession.id, kind: EdgeKinds.contains });
  addEdge({ source: identityUsers.id, target: createUser.id, kind: EdgeKinds.contains });
  addEdge({ source: billingPayments.id, target: chargeCard.id, kind: EdgeKinds.contains });

  const userEntity = addNode({
    kind: "entity",
    name: "user",
    moduleId: "identity",
    submoduleId: "users",
    id: buildId("entity", "identity.users.user"),
  });
  const passwordValueObject = addNode({
    kind: "value_object",
    name: "password",
    moduleId: "identity",
    submoduleId: "auth",
    id: buildId("value_object", "identity.auth.password"),
  });
  const paymentEntity = addNode({
    kind: "entity",
    name: "payment",
    moduleId: "billing",
    submoduleId: "payments",
    id: buildId("entity", "billing.payments.payment"),
  });

  addEdge({ source: identityUsers.id, target: userEntity.id, kind: EdgeKinds.contains });
  addEdge({ source: identityAuth.id, target: passwordValueObject.id, kind: EdgeKinds.contains });
  addEdge({ source: billingPayments.id, target: paymentEntity.id, kind: EdgeKinds.contains });

  const passwordPolicy = addNode({
    kind: "domain_interface",
    name: "password_policy",
    moduleId: "identity",
    submoduleId: "auth",
    metadata: { interfaceKind: "policy" },
    id: buildId("domain_interface", "identity.auth.password_policy"),
  });
  const defaultPasswordPolicy = addNode({
    kind: "domain_service",
    name: "default_password_policy",
    moduleId: "identity",
    submoduleId: "auth",
    metadata: { implements: "password_policy" },
    id: buildId("domain_service", "identity.auth.default_password_policy"),
  });
  const paymentStrategy = addNode({
    kind: "domain_interface",
    name: "payment_strategy",
    moduleId: "billing",
    submoduleId: "payments",
    metadata: { interfaceKind: "strategy" },
    id: buildId("domain_interface", "billing.payments.payment_strategy"),
  });
  const defaultPaymentStrategy = addNode({
    kind: "domain_service",
    name: "default_payment_strategy",
    moduleId: "billing",
    submoduleId: "payments",
    metadata: { implements: "payment_strategy" },
    id: buildId("domain_service", "billing.payments.default_payment_strategy"),
  });

  addEdge({
    source: passwordPolicy.id,
    target: defaultPasswordPolicy.id,
    kind: EdgeKinds.implements,
  });
  addEdge({
    source: paymentStrategy.id,
    target: defaultPaymentStrategy.id,
    kind: EdgeKinds.implements,
  });

  addEdge({ source: identityAuth.id, target: passwordPolicy.id, kind: EdgeKinds.contains });
  addEdge({ source: identityAuth.id, target: defaultPasswordPolicy.id, kind: EdgeKinds.contains });
  addEdge({ source: billingPayments.id, target: paymentStrategy.id, kind: EdgeKinds.contains });
  addEdge({ source: billingPayments.id, target: defaultPaymentStrategy.id, kind: EdgeKinds.contains });

  const userRepository = addNode({
    kind: "port",
    name: "user_repository",
    moduleId: "identity",
    submoduleId: "users",
    metadata: { methods: "get_by_id, save" },
    id: buildId("port", "identity.users.user_repository"),
  });
  const sqlUserRepository = addNode({
    kind: "adapter",
    name: "sql_user_repository",
    moduleId: "identity",
    submoduleId: "users",
    metadata: { implements: "user_repository" },
    id: buildId("adapter", "identity.users.sql_user_repository"),
  });
  const sessionCache = addNode({
    kind: "port",
    name: "session_cache",
    moduleId: "identity",
    submoduleId: "auth",
    metadata: { methods: "get, put" },
    id: buildId("port", "identity.auth.session_cache"),
  });
  const redisSessionCache = addNode({
    kind: "adapter",
    name: "redis_session_cache",
    moduleId: "identity",
    submoduleId: "auth",
    metadata: { implements: "session_cache" },
    id: buildId("adapter", "identity.auth.redis_session_cache"),
  });
  const paymentGateway = addNode({
    kind: "port",
    name: "payment_gateway",
    moduleId: "billing",
    submoduleId: "payments",
    metadata: { methods: "charge" },
    id: buildId("port", "billing.payments.payment_gateway"),
  });
  const stripeGateway = addNode({
    kind: "adapter",
    name: "stripe_payment_gateway",
    moduleId: "billing",
    submoduleId: "payments",
    metadata: { implements: "payment_gateway" },
    id: buildId("adapter", "billing.payments.stripe_payment_gateway"),
  });

  addEdge({ source: userRepository.id, target: sqlUserRepository.id, kind: EdgeKinds.implemented_by });
  addEdge({ source: sessionCache.id, target: redisSessionCache.id, kind: EdgeKinds.implemented_by });
  addEdge({ source: paymentGateway.id, target: stripeGateway.id, kind: EdgeKinds.implemented_by });

  addEdge({ source: identityUsers.id, target: userRepository.id, kind: EdgeKinds.contains });
  addEdge({ source: identityUsers.id, target: sqlUserRepository.id, kind: EdgeKinds.contains });
  addEdge({ source: identityAuth.id, target: sessionCache.id, kind: EdgeKinds.contains });
  addEdge({ source: identityAuth.id, target: redisSessionCache.id, kind: EdgeKinds.contains });
  addEdge({ source: billingPayments.id, target: paymentGateway.id, kind: EdgeKinds.contains });
  addEdge({ source: billingPayments.id, target: stripeGateway.id, kind: EdgeKinds.contains });

  const identityDb = addNode({
    kind: "capability",
    name: "db_postgres",
    moduleId: "identity",
    metadata: { moduleId: "identity" },
    id: buildId("capability", "identity.db_postgres"),
  });
  const identityRedis = addNode({
    kind: "capability",
    name: "redis",
    moduleId: "identity",
    metadata: { moduleId: "identity" },
    id: buildId("capability", "identity.redis"),
  });
  const billingDb = addNode({
    kind: "capability",
    name: "db_postgres",
    moduleId: "billing",
    metadata: { moduleId: "billing" },
    id: buildId("capability", "billing.db_postgres"),
  });

  addEdge({ source: identityModule.id, target: identityDb.id, kind: EdgeKinds.enabled_by });
  addEdge({ source: identityModule.id, target: identityRedis.id, kind: EdgeKinds.enabled_by });
  addEdge({ source: billingModule.id, target: billingDb.id, kind: EdgeKinds.enabled_by });

  addEdge({ source: changePassword.id, target: userRepository.id, kind: EdgeKinds.depends_on });
  addEdge({ source: changePassword.id, target: passwordPolicy.id, kind: EdgeKinds.depends_on });
  addEdge({ source: refreshSession.id, target: sessionCache.id, kind: EdgeKinds.depends_on });
  addEdge({ source: createUser.id, target: userRepository.id, kind: EdgeKinds.depends_on });
  addEdge({ source: chargeCard.id, target: paymentGateway.id, kind: EdgeKinds.depends_on });
  addEdge({ source: chargeCard.id, target: paymentStrategy.id, kind: EdgeKinds.depends_on });

  const errors = validateGraph({ nodes, edges });
  if (errors.length) {
    const summary = errors.map((error) => `${error.code}: ${error.message}`).join("\n");
    throw new Error(`Init graph template produced invalid graph:\n${summary}`);
  }

  return { nodes, edges };
}
