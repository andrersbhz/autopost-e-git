import React, { useState } from 'react';
import { cn, isVideoUrl } from '@/lib/utils';

interface NewsImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: 'video' | 'square' | 'wide' | 'tall' | 'hero';
}

const NewsImage = ({ src, alt, className, aspectRatio = 'video' }: NewsImageProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const video = isVideoUrl(src);

  const ratioClasses = {
    video: 'aspect-[4/5]',
    square: 'aspect-[4/5]',
    wide: 'aspect-[4/5]',
    tall: 'aspect-[4/5]',
    hero: 'aspect-[4/5]',
  };

  return (
    <div className={cn(
      "relative overflow-hidden bg-muted group h-auto",
      className
    )}>
      {video ? (
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          onLoadedData={() => setIsLoaded(true)}
          className={cn(
            "w-full h-auto object-contain transition-all duration-700",
            !isLoaded ? "scale-105 blur-sm" : "scale-100 blur-0"
          )}
        />
      ) : (
        <img
          src={src || 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d'}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d';
          }}
          className={cn(
            "w-full h-auto object-contain transition-all duration-700",
            !isLoaded ? "scale-105 blur-sm" : "scale-100 blur-0"
          )}
        />
      )}

      {/* Subtle overlay */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );
};

export default NewsImage;
