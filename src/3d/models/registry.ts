import type { RibCount, UmbrellaCategory } from "@/types/design";
import folding from "./configs/folding_21in_8panel_standard.json";
import straight from "./configs/straight_23in_8panel_standard.json";
import golf from "./configs/golf_30in_8panel_standard.json";

export interface UmbrellaModelConfig {
  model_id: string;
  category: UmbrellaCategory;
  display_name: string;
  rib_count: number;
  panel_count: number;
  rib_length_inch: number;
  rib_length_cm: number;
  canopy_diameter_cm: number;
  canopy_height_cm: number;
  canopy_arc_length_cm: number;
  shaft_length_cm: number;
  shaft_diameter_mm: number;
  shaft_color: string;
  top_cap_style: string;
  top_cap_dimensions: Record<string, number>;
  top_cap_color: string;
  rib_tip_style: string;
  rib_tip_dimensions: Record<string, number>;
  ferrule_style?: string;
  handle_style: string;
  handle_material: string;
  handle_color: string;
  canopy_material: string;
  canopy_layer: string;
  model_file: string;
  uv_template_file: string;
}

// Golf config exists but its GLB has not been delivered yet — keep it out
// of the active list until /public/models/golf_30in_8panel_standard.glb lands.
void golf;
const MODELS: UmbrellaModelConfig[] = [
  folding as UmbrellaModelConfig,
  straight as UmbrellaModelConfig,
];

export function findModel(
  category: UmbrellaCategory,
  ribCount: RibCount
): UmbrellaModelConfig | null {
  // A model is available only when a GLB with the matching category AND
  // panel count exists. Other combinations (golf, 6/7/10 ribs) return null
  // so the editor shows the "3D preview unavailable" fallback until a
  // matching GLB is added here.
  const match = MODELS.find(
    (m) => m.category === category && m.panel_count === ribCount
  );
  if (!match || !match.model_file?.toLowerCase().endsWith(".glb")) return null;
  return match;
}

export function listModels(): UmbrellaModelConfig[] {
  return MODELS;
}
