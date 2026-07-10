'use client';

import { useState } from 'react';

/**
 * The feed's image URL is a live resize-on-the-fly CDN link (e.g. `.../resize/60x60x900x900/...`
 * or `...?RESIZE=60x60x`) — swapping the requested width/height gets a much sharper version of the
 * same image for free. Swapped in on hover so the base table only ever loads the tiny thumbnail.
 */
function toLargeImage(url: string, size = 400): string {
  return url.replace(/resize\/\d+x\d+x/, `resize/${size}x${size}x`).replace(/RESIZE=\d+x\d+x/, `RESIZE=${size}x${size}x`);
}

export function ProductThumb({
  src,
  size,
  radius,
  style,
}: {
  src: string;
  size: number;
  radius: number;
  style?: React.CSSProperties;
}) {
  const [hovered, setHovered] = useState(false);

  if (!src) {
    return <div style={{ width: size, height: size, borderRadius: radius, background: 'var(--fill-secondary)', ...style }} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={hovered ? toLargeImage(src) : src}
      alt=""
      width={size}
      height={size}
      className="thumb-hover"
      onMouseEnter={() => setHovered(true)}
      style={{ borderRadius: radius, objectFit: 'contain', background: 'var(--fill-secondary)', ...style }}
    />
  );
}
