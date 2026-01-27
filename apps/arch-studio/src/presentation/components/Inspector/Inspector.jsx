import React from "react";
import { useGraphStore } from "../../../application/store/graphStore.ts";
import { updateNode } from "../../../application/usecases/updateNode.ts";
import { deleteNode } from "../../../application/usecases/deleteNode.ts";
import { getNodeFields, NodeKinds } from "../../../domain/graph/nodeTypes.ts";

export default function Inspector() {
  const nodes = useGraphStore((state) => state.nodes);
  const edges = useGraphStore((state) => state.edges);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const selectedEdgeId = useGraphStore((state) => state.selectedEdgeId);
  const clearError = useGraphStore((state) => state.clearError);

  const node = nodes.find((item) => item.id === selectedNodeId);
  const edge = edges.find((item) => item.id === selectedEdgeId);

  function handleChange(key, value) {
    clearError();
    const patch = { [key]: value };
    updateNode(node.id, patch);
  }

  function handleDelete() {
    clearError();
    deleteNode(node.id);
  }

  if (!node && !edge) {
    return (
      <section className="panel panel--right">
        <div className="panel__header">
          <h2>Inspector</h2>
          <p>Selecciona un nodo o arista</p>
        </div>
      </section>
    );
  }

  if (edge) {
    return (
      <section className="panel panel--right">
        <div className="panel__header">
          <h2>Inspector</h2>
          <p>Arista seleccionada</p>
        </div>
        <div className="panel__section">
          <div className="field">
            <span className="field__label">ID</span>
            <span className="field__value">{edge.id}</span>
          </div>
          <div className="field">
            <span className="field__label">Kind</span>
            <span className="field__value">{edge.data?.kind || "depends_on"}</span>
          </div>
        </div>
      </section>
    );
  }

  const fields = getNodeFields(node.data?.kind);
  const kindLabel = NodeKinds[node.data?.kind]?.label || node.data?.kind;

  return (
    <section className="panel panel--right">
      <div className="panel__header">
        <h2>Inspector</h2>
        <p>{kindLabel}</p>
      </div>
      <div className="panel__section">
        {fields.map((field) => (
          <label className="field" key={field.key}>
            <span className="field__label">{field.label}</span>
            <input
              className="field__input"
              value={node.data?.[field.key] || ""}
              placeholder={field.placeholder}
              onChange={(event) => handleChange(field.key, event.target.value)}
            />
          </label>
        ))}
      </div>
      <button className="danger" onClick={handleDelete}>
        Eliminar nodo
      </button>
    </section>
  );
}
