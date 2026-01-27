const STORAGE_KEY = "archstudio.graph";

export function saveGraph(snapshot) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    return { ok: true };
  } catch (error) {
    return { ok: false, error: "Failed to save graph." };
  }
}

export function loadGraph() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

export function exportGraph(snapshot) {
  return JSON.stringify(snapshot, null, 2);
}

export function importGraph(jsonText) {
  try {
    const payload = JSON.parse(jsonText);
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, error: "Invalid JSON file." };
  }
}
