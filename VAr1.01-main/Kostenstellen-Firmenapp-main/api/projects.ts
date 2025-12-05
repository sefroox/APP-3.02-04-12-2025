// api/projects.ts

export type Project = {
  id: string;
  name: string;
  status?: string;
  description?: string;
  budgetTotal?: number;
  budgetUsed?: number;
  manager?: string;
};

const API_BASE = "http://100.86.46.93:3000"; 
// Wenn Frontend über Proxy läuft: const API_BASE = "";

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) throw new Error("Fehler beim Laden der Projekte");
  return res.json();
}

export async function createProject(data: Omit<Project, "id">): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Fehler beim Erstellen des Projekts");
  return res.json();
}

export async function updateProject(id: string, data: Partial<Project>): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Fehler beim Ändern des Projekts");
  return res.json();
}

export async function deleteProject(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("Fehler beim Löschen des Projekts");
}

