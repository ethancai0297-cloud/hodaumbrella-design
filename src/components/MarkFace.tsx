import { Barcode } from "@/components/Barcode";
import { MarkVariant } from "@/types/shippingMark";

interface Props {
  variant: MarkVariant;
  side: "main" | "side";
  widthPx: number;
  heightPx: number;
}

const hasText = (v: string | undefined | null): v is string =>
  !!v && String(v).trim().length > 0;

export const MarkFace = ({ variant: v, side, widthPx, heightPx }: Props) => {
  const contentPadding = Math.max(8, Math.min(widthPx, heightPx) * 0.08);

  if (side === "main") {
    const img = v.mainImageDataUrl ?? v.imageDataUrl;

    const lines: React.ReactNode[] = [];
    if (hasText(v.customer)) lines.push(<div key="c">{v.customer}</div>);
    if (hasText(v.orderNo)) lines.push(<div key="o">ORDER NO. {v.orderNo}</div>);
    if (hasText(v.madeIn)) lines.push(<div key="m">{v.madeIn}</div>);
    if (hasText(v.cartonCount))
      lines.push(
        <div key="cc">CARTON NO.&nbsp;&nbsp;&nbsp;&nbsp;OF {v.cartonCount}</div>,
      );

    const rowEstimate = Math.max(1, lines.length) + (v.barcode ? 2 : 0);
    const fontSize = Math.max(
      5,
      Math.min(heightPx / (rowEstimate + 2), widthPx / 26),
    );

    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center text-center font-bold uppercase text-black"
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: 1.25,
          padding: `${contentPadding}px`,
        }}
      >
        {img ? (
          <img
            src={img}
            alt="main mark"
            className="max-h-full max-w-full object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
        ) : (
          <>
            {lines}
            {hasText(v.barcode) && (
              <Barcode
                value={v.barcode!}
                height={Math.round(fontSize * 1.8)}
                fontSize={Math.round(fontSize * 0.7)}
                className="mt-2"
              />
            )}
          </>
        )}
      </div>
    );
  }

  const img = v.sideImageDataUrl;

  const lines: React.ReactNode[] = [];
  if (hasText(v.model)) lines.push(<div key="md">MODELS: {v.model}</div>);
  if (hasText(v.colour)) lines.push(<div key="co">COLOUR : {v.colour}</div>);
  if (hasText(v.quantity)) lines.push(<div key="qt">QUANTITY : {v.quantity}</div>);
  if (hasText(v.gw)) lines.push(<div key="gw">G.W. : {v.gw}</div>);
  if (hasText(v.nw)) lines.push(<div key="nw">N.W. : {v.nw}</div>);
  if (hasText(v.meas)) lines.push(<div key="me">MEAS: {v.meas}</div>);

  const rowEstimate = Math.max(1, lines.length) + (v.sideBarcode ? 2 : 0);
  const fontSize = Math.max(
    5,
    Math.min(heightPx / (rowEstimate + 2), widthPx / 24),
  );

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center text-center font-bold uppercase text-black"
      style={{
        fontSize: `${fontSize}px`,
        lineHeight: 1.2,
        padding: `${contentPadding}px`,
      }}
    >
      {img ? (
        <img
          src={img}
          alt="side mark"
          className="max-h-full max-w-full object-contain"
          style={{ mixBlendMode: "multiply" }}
        />
      ) : (
        <>
          {lines}
          {hasText(v.sideBarcode) && (
            <Barcode
              value={v.sideBarcode!}
              height={Math.round(fontSize * 1.8)}
              fontSize={Math.round(fontSize * 0.7)}
              className="mt-2"
            />
          )}
        </>
      )}
    </div>
  );
};
