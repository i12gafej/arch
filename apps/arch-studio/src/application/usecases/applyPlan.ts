import { useGraphStore } from "../store/graphStore.ts";
import { applyPlan } from "../../infrastructure/adapters/workspaceAdapter.ts";

export function applyPlanUseCase() {
  const store = useGraphStore.getState();
  const plan = store.lastPlan;
  if (!plan) {
    return { ok: false, error: "No plan to apply." };
  }
  return applyPlan(plan);
}
