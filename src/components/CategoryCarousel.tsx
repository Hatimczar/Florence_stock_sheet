'use client';

import { ReactNode } from 'react';

export function CategoryCarousel<T>({
  title,
  count,
  items,
  renderCard,
}: {
  title: string;
  count: number;
  items: T[];
  renderCard: (item: T) => ReactNode;
}) {
  if (items.length === 0) return null;

  return (
    <section className="pc-carousel">
      <div className="pc-carousel-head">
        <div className="pc-section-title">{title}</div>
        <div className="pc-section-sub">{count.toLocaleString()} in stock</div>
      </div>
      <div className="pc-carousel-row">
        {items.map((item) => (
          <div className="pc-carousel-slide" key={renderKey(item)}>
            {renderCard(item)}
          </div>
        ))}
      </div>
    </section>
  );
}

// renderCard's return already carries a key on the actual card element in practice, but the slide
// wrapper itself also needs a stable key — items are expected to expose wic/vendor for this.
function renderKey(item: unknown): string {
  const i = item as { wic?: string; vendor?: string; partNumber?: string };
  return `${i.vendor ?? ''}-${i.wic ?? i.partNumber ?? Math.random()}`;
}
