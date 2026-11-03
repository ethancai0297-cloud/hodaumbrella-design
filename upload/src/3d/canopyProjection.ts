// canopyProjection.js — 把 2D 俯视设计图精确映射到 GLB 雨伞伞面上
//
// 原理：完全忽略模型自带的 UV（折伞模型的 UV 是重叠/镜像的，没法用），
// 加载后按每个伞面顶点的世界坐标做"俯视平面投影"重新生成 UV。
// 2D 设计图本身就是俯视图，所以贴上去天然一一对应，两个模型通用。
//
// 用法（纯 three.js）:
//   const gltf = await loader.loadAsync('/models/folding.glb');
//   const tex  = await textureFrom2D(document.querySelector('#design-svg'));
//   const info = applyCanopyTexture(gltf.scene, tex, { align: 'flat-top', panelCount: 8 });
//   scene.add(gltf.scene);
//
// 用法（@react-three/fiber）见 UmbrellaPreview.tsx
import * as THREE from 'three';

const CANOPY_RE = /canopy/i;

/** 找出所有伞面 mesh，计算其在世界坐标中的中心与外接圆半径（XZ 平面）。 */
export type Align = 'flat-top' | 'pointy-top' | 'none';
export interface ApplyOptions {
  align?: Align;
  panelCount?: number;
  rotateModel?: boolean;
  mirror?: boolean;
  padding?: number;
  material?: (texture: THREE.Texture) => THREE.Material;
}
export interface CanopyInfo {
  panels: THREE.Mesh[]; center: THREE.Vector3; radius: number; tipAngle: number; box: THREE.Box3;
}
export interface ApplyResult {
  center: THREE.Vector3; radius: number; panels: THREE.Mesh[]; material: THREE.Material; modelYawDeg: number;
}

export function measureCanopy(root: THREE.Object3D): CanopyInfo {
  root.updateMatrixWorld(true);
  const panels: THREE.Mesh[] = [];
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh && CANOPY_RE.test(o.name)) panels.push(o as THREE.Mesh); });
  if (!panels.length) throw new Error('No canopy_panel meshes found in model');

  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  for (const m of panels) {
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) box.expandByPoint(v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  }
  const center = box.getCenter(new THREE.Vector3());
  let radius = 0, tipAngle = 0;
  for (const m of panels) {
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      const dx = v.x - center.x, dz = v.z - center.z, r = Math.hypot(dx, dz);
      if (r > radius) { radius = r; tipAngle = Math.atan2(dz, dx); } // 伞尖在"画布坐标系"(x右, z下)中的角度
    }
  }
  return { panels, center, radius, tipAngle, box };
}

/** 把整把伞平移到伞面中心位于 (0, y, 0)，方便旋转和对相机。 */
export function centerUmbrella<T extends THREE.Object3D>(root: T): T {
  const { center } = measureCanopy(root);
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.updateMatrixWorld(true);
  return root;
}

/**
 * 核心函数：对齐模型朝向 + 为每片伞面重新生成 UV + 贴上 2D 设计贴图。
 *
 * @param root      GLTF 的 scene（或包裹它的 Group）
 * @param texture   THREE.Texture，内容为 2D 俯视设计图（正方形，雨伞外接圆撑满画布、圆心在正中）
 * @param opts.align       2D 八边形的朝向：'flat-top'（平顶，默认）| 'pointy-top'（尖顶）| 'none'（不旋转模型）
 * @param opts.panelCount  伞片数（默认 8），用于计算对齐角
 * @param opts.rotateModel 是否直接把算出的旋转应用到 root（默认 true）。设 false 时请自行把返回的 modelYawDeg 应用到父级 group
 * @param opts.mirror      若 3D 俯视结果左右镜像，设为 true
 * @param opts.padding     2D 图里伞外接圆到画布边缘的留白比例（默认 0）
 * @param opts.material    自定义材质工厂 (texture) => Material
 * @returns { center, radius, panels, material, modelYawDeg }
 */
export function applyCanopyTexture(root: THREE.Object3D, texture: THREE.Texture, opts: ApplyOptions = {}): ApplyResult {
  const { align = 'flat-top', panelCount = 8, rotateModel = true, mirror = false, padding = 0, material: matFactory } = opts;

  // ---- 1. 自动对齐：让模型伞尖的位置和 2D 八边形的伞尖位置一致 ----
  let modelYawDeg = 0;
  if (align !== 'none') {
    const { tipAngle } = measureCanopy(root);
    const sector = (2 * Math.PI) / panelCount;
    // 2D 约定（画布坐标，y 向下）：flat-top → 伞尖在 -90° ± sector/2；pointy-top → 伞尖在 -90°
    const target = align === 'pointy-top' ? -Math.PI / 2 : -Math.PI / 2 - sector / 2;
    let d = (target - tipAngle) % sector;            // 需要让伞尖在画布中转过的角度
    if (d > sector / 2 + 1e-6) d -= sector;
    if (d < -sector / 2 - 1e-6) d += sector;
    // 绕 +Y 旋转 θ 会让画布角度减少 θ，所以模型要转 -d
    modelYawDeg = THREE.MathUtils.radToDeg(-d);
    if (rotateModel) {
      // 模型原点通常不在伞面中心，所以旋转后要把伞面中心平移回原位（等价于绕伞面中心旋转）
      const before = measureCanopy(root).center;
      root.rotation.y += THREE.MathUtils.degToRad(modelYawDeg);
      root.updateMatrixWorld(true);
      const after = measureCanopy(root).center;
      root.position.add(before.sub(after));
      root.updateMatrixWorld(true);
    }
  }

  // ---- 2. 按（对齐后的）世界坐标做俯视投影，生成 UV ----
  const { panels, center, radius } = measureCanopy(root);
  const scale = 1 / (2 * radius * (1 + padding));
  const mat = matFactory ? matFactory(texture) : new THREE.MeshStandardMaterial({
    map: texture, side: THREE.DoubleSide, roughness: 0.75, metalness: 0,
  });

  const v = new THREE.Vector3();
  for (const m of panels) {
    const geo = m.geometry.clone();              // 不同 mesh 可能共享 geometry，先克隆
    const pos = geo.attributes.position;
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
      let u = 0.5 + (v.x - center.x) * scale;
      const vv = 0.5 - (v.z - center.z) * scale;  // CanvasTexture flipY=true：v=1 是画布顶部；俯视时世界 -Z 为上
      if (mirror) u = 1 - u;
      uv[i * 2] = u; uv[i * 2 + 1] = vv;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (geo.attributes.uv1) geo.deleteAttribute('uv1');
    if (geo.attributes.uv2) geo.deleteAttribute('uv2');
    m.geometry = geo;
    m.material = mat;
  }
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return { center, radius, panels, material: mat, modelYawDeg };
}

/**
 * 把页面上现有的 2D 设计（<svg> 或 <canvas>）转成 CanvasTexture。
 * 要求 2D 图是正方形，雨伞外接圆撑满画布且圆心在正中（否则用 padding 补偿）。
 * 2D 改动后：重新调用一次，然后 material.map = 新贴图；或者直接在同一 canvas 上重绘后 texture.needsUpdate = true。
 */
export async function textureFrom2D(el: HTMLCanvasElement | SVGSVGElement, size = 2048): Promise<THREE.CanvasTexture> {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  if (el instanceof HTMLCanvasElement) {
    ctx.drawImage(el, 0, 0, size, size);
  } else if (el instanceof SVGSVGElement) {
    const clone = el.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('width', String(size)); clone.setAttribute('height', String(size));
    if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    await new Promise<void>((res, rej) => {
      const img = new Image();
      img.onload = () => { ctx.drawImage(img, 0, 0, size, size); URL.revokeObjectURL(url); res(); };
      img.onerror = rej; img.src = url;
    });
  } else {
    throw new Error('textureFrom2D: expected <svg> or <canvas>');
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
