import { MarkVariant } from "@/types/shippingMark";
import { MarkFace } from "@/components/MarkFace";
import { resolveDims } from "@/lib/meas";
import { useEffect, useRef, useState } from "react";

interface Props {
  variant: MarkVariant;
}

export const MarkTable = ({ variant: v }: Props) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [wrapWidth, setWrapWidth] = useState(720);
  const dims = resolveDims(v.meas, v.dimensions);

  const cols = `${dims.l}fr ${dims.w}fr`;
  const faceHeight = Math.max(80, (wrapWidth * dims.h) / (dims.l + dims.w));
  const mainWidth = (wrapWidth * dims.l) / (dims.l + dims.w);
  const sideWidth = (wrapWidth * dims.w) / (dims.l + dims.w);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => setWrapWidth(el.clientWidth || 720);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="space-y-1.5">
      <div className="grid text-center text-[11px] font-bold uppercase text-black" style={{ gridTemplateColumns: cols }}>
        <div>正唛 (MAIN MARK)</div>
        <div>侧唛 (SIDE MARK)</div>
      </div>
      <div className="mark-table mark-sheet grid border-2 border-black text-black" style={{ gridTemplateColumns: cols }}>
        <div
          className="border-r-2 border-black overflow-hidden"
          style={{ height: `${faceHeight}px` }}
        >
          <MarkFace variant={v} side="main" widthPx={mainWidth} heightPx={faceHeight} />
        </div>
        <div
          className="overflow-hidden"
          style={{ height: `${faceHeight}px` }}
        >
          <MarkFace variant={v} side="side" widthPx={sideWidth} heightPx={faceHeight} />
        </div>
      </div>
    </div>
  );
};
