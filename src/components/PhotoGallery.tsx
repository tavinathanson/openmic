'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';

const PhotoGallery = () => {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // This will be populated with your actual photos
  const photos = [
    {
      src: '/images/3_2025_mic_2.jpg',
      text: 'Crowd goes wild for Suzanne Linfante!'
    },
    {
      src: '/images/10_2024_mic.jpg',
      text: 'Greg Rapport\'s musical comedy'
    },
    {
      src: '/images/9_2024_mic.jpg',
      text: 'John Corry sets the record straight'
    }
  ];

  if (!mounted) {
    return (
      <div className="py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
          Moments from Open Mic 
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div 
              key={i}
              className="group relative overflow-hidden rounded-lg shadow-lg bg-gray-200 animate-pulse h-[300px]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
        Moments from Open Mic
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {photos.map((photo, index) => (
          <div 
            key={index}
            className="group relative overflow-hidden rounded-lg shadow-lg transition-transform duration-300 hover:scale-[1.02] h-[300px]"
          >
            <Image
              src={photo.src}
              alt={photo.text}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="text-white text-sm font-medium">{photo.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PhotoGallery; 