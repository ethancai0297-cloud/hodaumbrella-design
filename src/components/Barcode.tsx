import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  value: string;
  height?: number;
  fontSize?: number;
  className?: string;
}

export const Barcode = ({ value, height = 50, fontSize = 14, className }: Props) => {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        height,
        fontSize,
        margin: 4,
        displayValue: true,
        background: "transparent",
        lineColor: "#000",
      });
    } catch {
      // ignore invalid values
    }
  }, [value, height, fontSize]);

  if (!value) return null;
  return (
    <svg
      ref={ref}
      className={className}
      style={{ maxWidth: "100%", height: "auto", mixBlendMode: "multiply" }}
    />
  );
};
