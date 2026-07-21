export function FlorenceLogo({ size = 28 }: { size?: number }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- small fixed-size brand icon; skips next/image's optimizer entirely */}
      <img src="/florence-icon.png" alt="Florence" width={size} height={size} className="brand-logo-light" style={{ width: size, height: size }} />
      {/* eslint-disable-next-line @next/next/no-img-element -- small fixed-size brand icon; skips next/image's optimizer entirely */}
      <img
        src="/florence-icon-white.png"
        alt="Florence"
        width={size}
        height={size}
        className="brand-logo-dark"
        style={{ width: size, height: size }}
      />
    </>
  );
}
