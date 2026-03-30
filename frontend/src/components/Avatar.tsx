'use client';

import { useState } from 'react';
import { User as UserIcon } from 'lucide-react';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  className?: string;
  fallbackText?: string;
}

export default function Avatar({ src, alt = 'avatar', size = 20, className = '', fallbackText }: AvatarProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 ${className}`}>
        {fallbackText ? (
          <span className="font-bold uppercase" style={{ fontSize: size * 0.4 }}>
            {fallbackText.slice(0, 2)}
          </span>
        ) : (
          <UserIcon size={size} />
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`object-cover ${className}`}
      onError={() => setError(true)}
    />
  );
}
