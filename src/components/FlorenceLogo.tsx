import Image from 'next/image';

export function FlorenceLogo({ size = 28 }: { size?: number }) {
  return (
    <>
      <Image
        src="/florence-icon.png"
        alt="Florence"
        width={size}
        height={size}
        className="brand-logo-light"
        priority
      />
      <Image
        src="/florence-icon-white.png"
        alt="Florence"
        width={size}
        height={size}
        className="brand-logo-dark"
        priority
      />
    </>
  );
}
