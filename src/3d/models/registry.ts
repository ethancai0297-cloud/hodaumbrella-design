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

const MODELS: UmbrellaModelConfig[] = [
  folding as UmbrellaModelConfig,
  straight as UmbrellaModelConfig,
  golf as UmbrellaModelConfig,
];

export function findModel(
  category: UmbrellaCategory,
  ribCount: RibCount
): UmbrellaModelConfig | null {
  return (
    MODELS.find((m) => m.category === category && m.rib_count === ribCount) ||
    null
  );
}

export function listModels(): UmbrellaModelConfig[] {
  return MODELS;
}
