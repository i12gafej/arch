import { useGraphStore } from "../store/graphStore.ts";

export function applyLayout(layoutFn) {
  const store = useGraphStore.getState();
  const nextNodes = layoutFn(store.nodes, store.edges);
  store.setNodes(nextNodes);
  return nextNodes;
}
