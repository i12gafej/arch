import { create } from "zustand";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";

export const useGraphStore = create((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  viewMode: "onion",
  lastPlan: null,
  doctorReport: null,
  lastError: null,
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  updateNode: (id, patch) =>
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== id) {
          return node;
        }
        const nextData = { ...(node.data || {}), ...(patch.data || {}) };
        const nextNode = { ...node, ...patch, data: nextData };
        return nextNode;
      }),
    })),
  removeNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    })),
  addEdge: (edge) => set((state) => ({ edges: [...state.edges, edge] })),
  removeEdge: (id) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== id),
      selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
    })),
  applyNodeChanges: (changes) =>
    set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
  applyEdgeChanges: (changes) =>
    set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),
  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setPlan: (plan) => set({ lastPlan: plan }),
  setDoctorReport: (report) => set({ doctorReport: report }),
  setError: (error) => set({ lastError: error }),
  clearError: () => set({ lastError: null }),
  hydrateGraph: (payload) =>
    set({
      nodes: payload.nodes || [],
      edges: payload.edges || [],
      viewMode: payload.viewMode || "onion",
      lastPlan: null,
      doctorReport: null,
      selectedNodeId: null,
      selectedEdgeId: null,
    }),
}));

export function getGraphState() {
  return useGraphStore.getState();
}
