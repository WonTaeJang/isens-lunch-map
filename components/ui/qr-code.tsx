import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

const QUIET_ZONE = 4; // Modules of white margin that scanners need around the code.

/** QR code drawn as one SVG path, so it stays sharp at any size and needs no image request. */
export default function QrCode({
  value,
  label,
  size = 200,
}: {
  value: string;
  label: string;
  size?: number;
}) {
  const { count, path } = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(value);
    qr.make();
    const modules = qr.getModuleCount();
    let d = '';
    for (let row = 0; row < modules; row++)
      for (let col = 0; col < modules; col++)
        if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
    return { count: modules, path: d };
  }, [value]);
  const box = count + QUIET_ZONE * 2;
  return (
    <svg
      role="img"
      aria-label={label}
      width={size}
      height={size}
      viewBox={`${-QUIET_ZONE} ${-QUIET_ZONE} ${box} ${box}`}
      shapeRendering="crispEdges"
    >
      <rect x={-QUIET_ZONE} y={-QUIET_ZONE} width={box} height={box} fill="#fff" />
      <path d={path} fill="#1d2a30" />
    </svg>
  );
}
