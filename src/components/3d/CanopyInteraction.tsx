import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { ArtworkItem } from "@/types/design";
import { canopy2DRadius, panelCentroid } from "@/components/UmbrellaCanopy";
import { measureCanopy } from "@/3d/canopyProjection";

/**
 * Direct editing on the 3D canopy.
 *
 * The canopy texture is the top-down 2D design (SVG units, centre 0,0,
 * radius = canopy2DRadius) projected straight down onto the GLB panels, so a
 * raycast hit's UV converts back to design coordinates exactly. From there:
 * click = select a panel, press on artwork = drag it, and the selected
 * artwork gets scale / rotate handles drawn as a DOM overlay.
 */
export interface CanopyInteractionProps {
  category: string;
  ribCount: number;
  items: ArtworkItem[];
  selectedItemId: string | null;
  onPanelClick: (panel: number) => void;
  onBlankClick?: () => void;
  onHoverPanel: (panel: number | null) => void;
  onItemSelect: (id: string | null) => void;
  onItemChange: (id: string, patch: Partial<ArtworkItem>) => void;
  /** DOM layer above the canvas for the selection handles. */
  overlay: React.RefObject<HTMLDivElement>;
}

interface Frame {
  cx: number;
  cy: number;
  rot: number; // radians, SVG (clockwise on screen when seen from above)
  hw: number;
  hh: number;
  panel: number | null; // null = full-canopy artwork
  unit: number; // design units per 1.0 of item.x / item.y
  dragRot: number; // rotation used to turn drag deltas into item.x/y
}

const DEG = Math.PI / 180;

function rotate(x: number, y: number, a: number): [number, number] {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c - y * s, x * s + y * c];
}

/** Where each copy of an artwork item sits, in design units. */
export function itemFrames(item: ArtworkItem, ribCount: number, outerR: number): Frame[] {
  const innerR = outerR * 0.022;
  if (item.type !== "text" && item.printArea === "full-canopy" && item.src) {
    const rot = item.rotation * DEG;
    // SVG: rotate(r) translate(x*R, y*R)
    const [cx, cy] = rotate(item.x * outerR, item.y * outerR, rot);
    const half = outerR * item.scale;
    return [{ cx, cy, rot, hw: half, hh: half, panel: null, unit: outerR, dragRot: rot }];
  }
  return item.panels.map((p) => {
    const c = panelCentroid(p, ribCount, outerR, innerR);
    const bs = outerR * 0.5 * item.scale;
    const rot = (c.angle + 90 + item.rotation) * DEG;
    const [ox, oy] = rotate(item.x * bs, item.y * bs, rot);
    let hw = bs / 2, hh = bs / 2;
    if (item.type === "text") {
      const fs = (item.fontSize || 18) * item.scale;
      hw = Math.max(fs, 0.62 * fs * (item.text?.length || 1)) / 2;
      hh = fs * 0.6;
    }
    return { cx: c.x + ox, cy: c.y + oy, rot, hw, hh, panel: p, unit: bs, dragRot: rot };
  });
}

export function panelIndexAt(x: number, y: number, ribCount: number) {
  const slice = (Math.PI * 2) / ribCount;
  const a = Math.atan2(y, x) + Math.PI / 2;
  return ((Math.round(a / slice) % ribCount) + ribCount) % ribCount;
}

function inFrame(f: Frame, x: number, y: number, pad = 0) {
  const [lx, ly] = rotate(x - f.cx, y - f.cy, -f.rot);
  return Math.abs(lx) <= f.hw + pad && Math.abs(ly) <= f.hh + pad;
}

export function CanopyInteraction(props: CanopyInteractionProps) {
  const { camera, gl, scene } = useThree();
  const propsRef = useRef(props);
  propsRef.current = props;
  const raycaster = useRef(new THREE.Raycaster());
  const canopyRef = useRef<{ meshes: THREE.Mesh[]; cx: number; cz: number; r: number; top: number } | null>(null);
  const hoverRef = useRef<number | null>(null);
  const dragging = useRef(false);

  const canopy = () => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && /canopy/i.test(o.name)) meshes.push(o as THREE.Mesh);
    });
    if (!meshes.length) return null;
    const c = canopyRef.current;
    if (c && c.meshes.length === meshes.length && c.meshes.every((m, i) => m === meshes[i])) return c;
    const info = measureCanopy(scene);
    canopyRef.current = { meshes, cx: info.center.x, cz: info.center.z, r: info.radius, top: info.box.max.y };
    return canopyRef.current;
  };

  const R = () => canopy2DRadius(propsRef.current.category);

  /** Pointer -> design coordinates on the canopy (or null). */
  const pick = (clientX: number, clientY: number) => {
    const c = canopy();
    if (!c) return null;
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.current.setFromCamera(ndc, camera);
    const hit = raycaster.current.intersectObjects(c.meshes, false)[0];
    if (!hit?.uv) return null;
    const r = R();
    return { x: (hit.uv.x - 0.5) * 2 * r, y: (0.5 - hit.uv.y) * 2 * r };
  };

  /** Design coordinates -> point on the (outer) canopy surface. */
  const toWorld = (x: number, y: number) => {
    const c = canopy();
    if (!c) return null;
    const r = R();
    const X = c.cx + (x / r) * c.r;
    const Z = c.cz + (y / r) * c.r;
    raycaster.current.set(new THREE.Vector3(X, c.top + 1, Z), new THREE.Vector3(0, -1, 0));
    const hit = raycaster.current.intersectObjects(c.meshes, false)[0];
    return hit ? hit.point.clone() : new THREE.Vector3(X, c.top, Z);
  };

  const toScreen = (v: THREE.Vector3) => {
    const p = v.clone().project(camera);
    const w = gl.domElement.clientWidth, h = gl.domElement.clientHeight;
    return { x: (p.x * 0.5 + 0.5) * w, y: (1 - (p.y * 0.5 + 0.5)) * h, behind: p.z > 1 };
  };

  /** Topmost artwork under a design point (selected item first). */
  const hitItem = (x: number, y: number) => {
    const { items, ribCount, selectedItemId } = propsRef.current;
    const r = R();
    const order = [...items].reverse();
    order.sort((a, b) => (a.id === selectedItemId ? -1 : b.id === selectedItemId ? 1 : 0));
    for (const it of order) {
      const full = it.type !== "text" && it.printArea === "full-canopy";
      if (full && it.id !== selectedItemId) continue; // full-canopy art covers everything: only drag once selected
      for (const f of itemFrames(it, ribCount, r)) {
        if (f.panel != null && panelIndexAt(x, y, ribCount) !== f.panel) continue;
        if (inFrame(f, x, y, 2)) return { item: it, frame: f };
      }
    }
    return null;
  };

  // Pointer handling on the canvas. Capture phase so a press on artwork can
  // stop OrbitControls from turning the umbrella.
  useEffect(() => {
    const el = gl.domElement;
    let down: { x: number; y: number; id: number } | null = null;
    let drag: { id: number; item: ArtworkItem; frame: Frame; sx: number; sy: number; x0: number; y0: number } | null = null;
    let raf = 0;
    let last: PointerEvent | null = null;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || e.shiftKey) return; // right / shift drag = pan (UmbrellaScene)
      down = { x: e.clientX, y: e.clientY, id: e.pointerId };
      const p = pick(e.clientX, e.clientY);
      if (!p) return;
      const h = hitItem(p.x, p.y);
      if (!h) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      propsRef.current.onItemSelect(h.item.id);
      drag = { id: e.pointerId, item: h.item, frame: h.frame, sx: p.x, sy: p.y, x0: h.item.x, y0: h.item.y };
      dragging.current = true;
      el.style.cursor = "grabbing";
    };
    const onMove = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) {
        const p = pick(e.clientX, e.clientY);
        if (!p) return;
        const [rx, ry] = rotate(p.x - drag.sx, p.y - drag.sy, -drag.frame.dragRot);
        const lim = drag.frame.panel == null ? 1.5 : 2;
        propsRef.current.onItemChange(drag.item.id, {
          x: Math.max(-lim, Math.min(lim, drag.x0 + rx / drag.frame.unit)),
          y: Math.max(-lim, Math.min(lim, drag.y0 + ry / drag.frame.unit)),
        });
        return;
      }
      if (e.buttons) return; // orbiting
      last = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!last) return;
        const p = pick(last.clientX, last.clientY);
        const { ribCount } = propsRef.current;
        const over = p ? hitItem(p.x, p.y) : null;
        el.style.cursor = over ? "grab" : p ? "pointer" : "";
        const idx = p ? panelIndexAt(p.x, p.y, ribCount) : null;
        if (idx !== hoverRef.current) {
          hoverRef.current = idx;
          propsRef.current.onHoverPanel(idx);
        }
      });
    };
    const onUp = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) {
        drag = null;
        dragging.current = false;
        el.style.cursor = "grab";
        down = null;
        return;
      }
      if (!down || e.pointerId !== down.id) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 5) return; // that was an orbit
      const p = pick(e.clientX, e.clientY);
      if (p) {
        propsRef.current.onItemSelect(null);
        propsRef.current.onPanelClick(panelIndexAt(p.x, p.y, propsRef.current.ribCount));
      } else {
        propsRef.current.onBlankClick?.();
      }
    };
    const onLeave = () => {
      if (hoverRef.current != null) {
        hoverRef.current = null;
        propsRef.current.onHoverPanel(null);
      }
    };
    el.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
      el.style.cursor = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, camera, scene]);

  // Selection handles (DOM overlay): dashed box, 4 scale corners, 1 rotate knob.
  const hud = useRef<{
    root: HTMLDivElement;
    poly: SVGPolygonElement;
    stem: SVGLineElement;
    corners: HTMLDivElement[];
    knob: HTMLDivElement;
    center: { x: number; y: number };
    handedness: number;
  } | null>(null);

  useEffect(() => {
    const host = props.overlay.current;
    if (!host) return;
    const root = document.createElement("div");
    root.style.cssText = "position:absolute;inset:0;pointer-events:none;display:none";
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.style.cssText = "position:absolute;inset:0;overflow:visible";
    const poly = document.createElementNS(svgNS, "polygon");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", "#2f6bff");
    poly.setAttribute("stroke-width", "2");
    poly.setAttribute("stroke-dasharray", "6 4");
    const stem = document.createElementNS(svgNS, "line");
    stem.setAttribute("stroke", "#2f6bff");
    stem.setAttribute("stroke-width", "2");
    svg.append(poly, stem);
    root.append(svg);
    const mk = (round: boolean, cursor: string, title: string) => {
      const d = document.createElement("div");
      d.title = title;
      d.style.cssText = `position:absolute;width:14px;height:14px;margin:-7px 0 0 -7px;background:#fff;border:2.5px solid #2f6bff;border-radius:${
        round ? "50%" : "2px"
      };pointer-events:auto;cursor:${cursor};touch-action:none;box-shadow:0 1px 3px rgba(0,0,0,.25)`;
      root.append(d);
      return d;
    };
    const corners = [0, 1, 2, 3].map(() => mk(false, "nwse-resize", "Scale"));
    const knob = mk(true, "grab", "Rotate");
    host.append(root);
    hud.current = { root, poly, stem, corners, knob, center: { x: 0, y: 0 }, handedness: 1 };

    const startHandle = (kind: "scale" | "rotate") => (e: PointerEvent) => {
      const { items, selectedItemId } = propsRef.current;
      const item = items.find((i) => i.id === selectedItemId);
      if (!item || !hud.current) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = host.getBoundingClientRect();
      const C = { ...hud.current.center };
      const hand = hud.current.handedness;
      const p0 = { x: e.clientX - rect.left - C.x, y: e.clientY - rect.top - C.y };
      const d0 = Math.hypot(p0.x, p0.y) || 1;
      const a0 = Math.atan2(p0.y, p0.x);
      const s0 = item.scale, r0 = item.rotation;
      dragging.current = true;
      const move = (ev: PointerEvent) => {
        const p = { x: ev.clientX - rect.left - C.x, y: ev.clientY - rect.top - C.y };
        if (kind === "scale") {
          const s = Math.max(0.1, Math.min(6, (s0 * Math.hypot(p.x, p.y)) / d0));
          propsRef.current.onItemChange(item.id, { scale: Math.round(s * 100) / 100 });
        } else {
          let r = r0 + ((Math.atan2(p.y, p.x) - a0) / DEG) * hand;
          r = ((((r + 180) % 360) + 360) % 360) - 180;
          propsRef.current.onItemChange(item.id, { rotation: Math.round(r) });
        }
      };
      const up = () => {
        dragging.current = false;
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    };
    const onScale = startHandle("scale");
    const onRotate = startHandle("rotate");
    corners.forEach((c) => c.addEventListener("pointerdown", onScale));
    knob.addEventListener("pointerdown", onRotate);
    return () => {
      corners.forEach((c) => c.removeEventListener("pointerdown", onScale));
      knob.removeEventListener("pointerdown", onRotate);
      root.remove();
      hud.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.overlay]);

  useFrame(() => {
    const h = hud.current;
    if (!h) return;
    const { items, selectedItemId, ribCount } = propsRef.current;
    const item = items.find((i) => i.id === selectedItemId);
    if (!item || !canopy()) {
      h.root.style.display = "none";
      return;
    }
    const r = R();
    // Of the item's copies, show handles on the one nearest the camera.
    let best: Frame | null = null;
    let bestD = Infinity;
    for (const f of itemFrames(item, ribCount, r)) {
      const w = toWorld(f.cx, f.cy);
      if (!w) continue;
      const d = w.distanceTo(camera.position);
      if (d < bestD) {
        bestD = d;
        best = f;
      }
    }
    if (!best) {
      h.root.style.display = "none";
      return;
    }
    const f = best;
    const local = (lx: number, ly: number) => {
      const [dx, dy] = rotate(lx, ly, f.rot);
      const w = toWorld(f.cx + dx, f.cy + dy);
      return w ? toScreen(w) : null;
    };
    const pad = 4;
    const pts = [
      local(-f.hw - pad, -f.hh - pad),
      local(f.hw + pad, -f.hh - pad),
      local(f.hw + pad, f.hh + pad),
      local(-f.hw - pad, f.hh + pad),
    ];
    const c = local(0, 0);
    const topMid = local(0, -f.hh - pad);
    const knobP = local(0, -f.hh - pad - Math.max(14, f.hh * 0.6));
    const ax = local(10, 0);
    const ay = local(0, 10);
    if (pts.some((p) => !p || p.behind) || !c || !topMid || !knobP || !ax || !ay) {
      h.root.style.display = "none";
      return;
    }
    h.root.style.display = "block";
    h.poly.setAttribute("points", pts.map((p) => `${p!.x},${p!.y}`).join(" "));
    h.stem.setAttribute("x1", String(topMid.x));
    h.stem.setAttribute("y1", String(topMid.y));
    h.stem.setAttribute("x2", String(knobP.x));
    h.stem.setAttribute("y2", String(knobP.y));
    pts.forEach((p, i) => {
      h.corners[i].style.left = `${p!.x}px`;
      h.corners[i].style.top = `${p!.y}px`;
    });
    h.knob.style.left = `${knobP.x}px`;
    h.knob.style.top = `${knobP.y}px`;
    h.center = { x: c.x, y: c.y };
    // Seen from below the design is mirrored: flip the rotate direction.
    const cross = (ax.x - c.x) * (ay.y - c.y) - (ax.y - c.y) * (ay.x - c.x);
    h.handedness = cross >= 0 ? 1 : -1;
  });

  return null;
}
