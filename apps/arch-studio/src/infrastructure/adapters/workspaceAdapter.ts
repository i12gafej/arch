export function applyPlan(plan) {
  if (!plan) {
    return { ok: false, error: "Plan is empty." };
  }
  return {
    ok: true,
    applied: false,
    message: "Workspace adapter is stubbed in the frontend MVP.",
    actions: plan.actions || [],
  };
}
