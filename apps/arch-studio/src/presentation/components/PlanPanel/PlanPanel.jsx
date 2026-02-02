import React from "react";
import { useGraphStore } from "../../../application/store/graphStore.ts";
import { generatePlanUseCase } from "../../../application/usecases/generatePlan.ts";
import { applyPlanUseCase } from "../../../application/usecases/applyPlan.ts";
import { runDoctorUseCase } from "../../../application/usecases/runDoctor.ts";

export default function PlanPanel() {
  const lastPlan = useGraphStore((state) => state.lastPlan);
  const doctorReport = useGraphStore((state) => state.doctorReport);
  const lastError = useGraphStore((state) => state.lastError);
  const clearError = useGraphStore((state) => state.clearError);
  const setError = useGraphStore((state) => state.setError);

  function handleGenerate() {
    clearError();
    const result = generatePlanUseCase();
    if (result?.errors?.length) {
      setError("Plan invalido: corrige el grafo.");
    }
  }

  function handleApply() {
    clearError();
    const result = applyPlanUseCase();
    if (!result.ok) {
      setError(result.error || "No se pudo aplicar el plan.");
    }
  }

  function handleDoctor() {
    clearError();
    const report = runDoctorUseCase();
    if (report.errors?.length) {
      setError("Doctor encontro errores.");
    }
  }

  return (
    <section className="panel panel--bottom">
      <div className="panel__header">
        <h2>Plan & Doctor</h2>
        <p>Compila, valida y aplica</p>
      </div>
      <div className="panel__section panel__actions">
        <button className="ghost" onClick={handleGenerate}>
          Generar plan
        </button>
        <button className="ghost" onClick={handleApply}>
          Aplicar plan
        </button>
        <button className="ghost" onClick={handleDoctor}>
          Run Doctor
        </button>
      </div>
      {lastError ? (
        <div className="status status--error">{lastError}</div>
      ) : (
        <div className="status status--ok">Sin bloqueos</div>
      )}
      <div className="panel__section">
        <div className="panel__split">
          <div>
            <h3>Plan</h3>
            <pre className="code">
              {lastPlan ? JSON.stringify(lastPlan, null, 2) : "Sin plan"}
            </pre>
          </div>
          <div>
            <h3>Doctor</h3>
            <pre className="code">
              {doctorReport ? JSON.stringify(doctorReport, null, 2) : "Sin reporte"}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
