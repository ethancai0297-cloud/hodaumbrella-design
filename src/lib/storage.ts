import { DesignProject } from "@/types/design";

const KEY = "urs:projects";

const withDefaults = (p: DesignProject): DesignProject => ({
  hasPouch: false,
  pouchArtwork: [],
  pouchView: "spread",
  panelColors: {},
  ...p,
});

export const loadProjects = (): DesignProject[] => {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DesignProject[]).map(withDefaults) : [];
  } catch {
    return [];
  }
};

export const saveProject = (project: DesignProject) => {
  const all = loadProjects();
  const idx = all.findIndex((p) => p.id === project.id);
  const next = { ...project, updatedAt: Date.now() };
  if (idx >= 0) all[idx] = next;
  else all.push(next);
  localStorage.setItem(KEY, JSON.stringify(all));
};

export const deleteProject = (id: string) => {
  const all = loadProjects().filter((p) => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
};

export const getProject = (id: string) =>
  loadProjects().find((p) => p.id === id);
