export type BoxType = "folding" | "straight";

export type FaceKey = "front" | "back" | "left" | "right" | "top" | "bottom";

export interface DisplayBoxVariant {
  id: string;
  name: string;
  notes?: string;
  faces: Partial<Record<FaceKey, string>>;
}

export interface DisplayBoxProject {
  id: string;
  createdAt: number;
  updatedAt: number;
  title: string;
  description: string;
  boxType: BoxType;
  dimensions: { l: number; w: number; h: number };
  variants: DisplayBoxVariant[];
}

export const BOX_PRESETS: Record<BoxType, { l: number; w: number; h: number; label: string }> = {
  folding: { l: 28, w: 12, h: 8, label: "折叠伞 Folding Umbrella" },
  straight: { l: 90, w: 12, h: 8, label: "直伞 Straight Umbrella" },
};

export const createEmptyDisplayBoxVariant = (): DisplayBoxVariant => ({
  id: crypto.randomUUID(),
  name: "DESIGN A",
  faces: {},
});

export const createEmptyDisplayBoxProject = (
  boxType: BoxType = "folding",
): DisplayBoxProject => ({
  id: crypto.randomUUID(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  title: "DISPLAY-001",
  description: "Display box preview — upload artwork for each face.",
  boxType,
  dimensions: { ...BOX_PRESETS[boxType] },
  variants: [createEmptyDisplayBoxVariant()],
});
