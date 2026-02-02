import { createGraphSnapshot } from "../../application/ports/graphGateway.ts";
import { useGraphStore } from "../../application/store/graphStore.ts";

export const storeGraphGateway = {
  getState() {
    return createGraphSnapshot(useGraphStore.getState());
  },

  addNode(node) {
    useGraphStore.getState().addNode(node);
  },

  updateNode(id, patch) {
    useGraphStore.getState().updateNode(id, patch);
  },

  removeNode(id) {
    useGraphStore.getState().removeNode(id);
  },

  addEdge(edge) {
    useGraphStore.getState().addEdge(edge);
  },

  removeEdge(id) {
    useGraphStore.getState().removeEdge(id);
  },

  setNodes(nodes) {
    useGraphStore.getState().setNodes(nodes);
  },

  setEdges(edges) {
    useGraphStore.getState().setEdges(edges);
  },

  hydrateGraph(payload) {
    useGraphStore.getState().hydrateGraph(payload);
  },

  setPlan(plan) {
    useGraphStore.getState().setPlan(plan);
  },

  setDoctorReport(report) {
    useGraphStore.getState().setDoctorReport(report);
  },

  setError(message) {
    useGraphStore.getState().setError(message);
  },

  clearError() {
    useGraphStore.getState().clearError();
  },
};
