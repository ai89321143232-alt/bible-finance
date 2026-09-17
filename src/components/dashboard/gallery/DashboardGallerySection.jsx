import React from 'react';
import PedestalTile from '@/components/dashboard/gallery/PedestalTile';

export default function DashboardGallerySection({ title, accent, items }) {
  return (
    <section className={`ds-section ds-${accent}`}>
      <div className="ds-section-title"><h2>{title}</h2><span>···</span></div>
      <div className="ds-cards">
        {items.map((item, index) => <PedestalTile key={item.label} item={item} index={index} />)}
      </div>
    </section>
  );
}