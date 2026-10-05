import React, { useState } from 'react';
import { ShoppingBag } from 'lucide-react';

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackTitle?: string;
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  className = '',
  fallbackTitle,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#18181B] via-[#121214] to-[#0B0B0C] text-[#A1A1AA] p-6 text-center ${className}`}
        role="img"
        aria-label={alt || fallbackTitle || 'Malik G Collection product image'}
      >
        <ShoppingBag className="w-8 h-8 text-[#D4AF37]/70 mb-2 stroke-[1.5]" />
        <span className="font-display text-sm tracking-wider text-[#F5F5F0]/80 uppercase">
          {fallbackTitle || alt || 'Malik G Collection'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || 'Malik G Collection'}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
      {...props}
    />
  );
};
