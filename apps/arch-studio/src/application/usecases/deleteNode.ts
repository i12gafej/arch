import { useGraphStore } from "../store/graphStore.ts";

export function deleteNode(id) {
  const store = useGraphStore.getState();
  store.removeNode(id);
  return { ok: true };
}
