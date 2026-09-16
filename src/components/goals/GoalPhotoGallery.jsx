import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function GoalPhotoGallery({ goalId, photoUris = [] }) {
  const [urls, setUrls] = useState([]);

  useEffect(() => {
    if (photoUris.length === 0) return;
    base44.functions.invoke('signGoalPhotos', { goalId })
      .then((response) => setUrls(response.data.urls || []));
  }, [goalId, photoUris.length]);

  if (urls.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2">
      {urls.map((url, index) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
          <img src={url} alt={`Фото цели ${index + 1}`} className="h-20 w-full object-cover" />
        </a>
      ))}
    </div>
  );
}