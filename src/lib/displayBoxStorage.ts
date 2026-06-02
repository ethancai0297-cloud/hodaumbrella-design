import { DisplayBoxProject } from "@/types/displayBox";

const KEY = "display_box_projects_v1";

export function loadDisplayProjects(): DisplayBoxProject[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveDisplayProject(p: DisplayBoxProject) {
  const list = loadDisplayProjects();
  const idx = list.findIndex((x) => x.id === p.id);
  const updated = { ...p, updatedAt: Date.now() };
  if (idx >= 0) list[idx] = updated;
  else list.unshift(updated);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function deleteDisplayProject(id: string) {
  const list = loadDisplayProjects().filter((p) => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getDisplayProject(id: string): DisplayBoxProject | undefined {
  return loadDisplayProjects().find((p) => p.id === id);
}

export function duplicateDisplayProject(id: string): DisplayBoxProject | undefined {
  const p = getDisplayProject(id);
  if (!p) return undefined;
  const copy: DisplayBoxProject = {
    ...p,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    title: p.title + " (副本)",
    variants: p.variants.map((v) => ({ ...v, id: crypto.randomUUID(), faces: { ...v.faces } })),
  };
  saveDisplayProject(copy);
  return copy;
}
