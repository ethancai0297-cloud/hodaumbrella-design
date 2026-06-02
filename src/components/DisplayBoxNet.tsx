import { useEffect, useRef, useState } from "react";
import { DisplayBoxVariant, FaceKey } from "@/types/displayBox";

interface Props {
  variant: DisplayBoxVariant;
  dimensions: { l: number; w: number; h: number };
}

interface CellProps {
  label: string;
  src?: string;
  w: number;
  h: number;
  style?: React.CSSProperties;
}

const Cell = ({ label, src, w, h, style }: CellProps) => (
  <div
    className="flex items-center justify-center overflow-hidden border-2 border-black bg-white text-center text-[10px] font-bold uppercase text-neutral-500"
    style={{ width: w, height: h, ...style }}
  >
    {src ? (
      <img src={src} alt={label} className="h-full w-full object-cover" />
    ) : (
      <span>{label}</span>
    )}
  </div>
);

export const DisplayBoxNet = ({ variant, dimensions }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapWidth, setWrapWidth] = useState(720);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWrapWidth(el.clientWidth || 720);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { l, w, h } = dimensions;
  const totalUnitsW = l * 2 + w * 2;
  const totalUnitsH = w * 2 + h;

  const scale = Math.min(wrapWidth / totalUnitsW, 320 / totalUnitsH);

  const L = l * scale;
  const W = w * scale;
  const H = h * scale;

  const faces = variant.faces;
  const f = (k: FaceKey) => faces[k];

  return (
    <div ref={wrapRef} className="w-full overflow-x-auto">
      <div
        className="relative mx-auto"
        style={{ width: totalUnitsW * scale, height: totalUnitsH * scale }}
      >
        <div className="absolute" style={{ left: W, top: 0 }}>
          <Cell label="TOP" src={f("top")} w={L} h={W} />
        </div>
        <div className="absolute flex" style={{ left: 0, top: W }}>
          <Cell label="LEFT" src={f("left")} w={W} h={H} />
          <Cell label="FRONT" src={f("front")} w={L} h={H} />
          <Cell label="RIGHT" src={f("right")} w={W} h={H} />
          <Cell label="BACK" src={f("back")} w={L} h={H} />
        </div>
        <div className="absolute" style={{ left: W, top: W + H }}>
          <Cell label="BOTTOM" src={f("bottom")} w={L} h={W} />
        </div>
      </div>
    </div>
  );
};
