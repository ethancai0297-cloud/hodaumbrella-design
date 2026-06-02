import { ShippingMarkProject } from "@/types/shippingMark";

const KEY = "shipping_mark_projects_v2";

export function loadProjects(): ShippingMarkProject[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProject(p: ShippingMarkProject) {
  const list = loadProjects();
  const idx = list.findIndex((x) => x.id === p.id);
  const updated = { ...p, updatedAt: Date.now() };
  if (idx >= 0) list[idx] = updated;
  else list.unshift(updated);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function deleteProject(id: string) {
  const list = loadProjects().filter((p) => p.id !== id);
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function getProject(id: string): ShippingMarkProject | undefined {
  return loadProjects().find((p) => p.id === id);
}

export function duplicateProject(id: string): ShippingMarkProject | undefined {
  const p = getProject(id);
  if (!p) return undefined;
  const copy: ShippingMarkProject = {
    ...p,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    title: p.title + " (副本)",
    variants: p.variants.map((v) => ({ ...v, id: crypto.randomUUID() })),
  };
  saveProject(copy);
  return copy;
}
