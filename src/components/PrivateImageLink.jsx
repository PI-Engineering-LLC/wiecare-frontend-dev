import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
const DEFAULT_AVATAR = '/wiecare-logo';

export function PrivateImageLink({ storageKey, alt, className = "", isLink = true, ...props }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function getSecureUrl() {
      try {
        setLoading(true);
        // const response = await fetch(`/api/get-presigned-url?key=${encodeURIComponent(storageKey)}`);
        // const data = await response.json();
        const { downloadUrl } = await api.getS3FileUrl({ fileKey:storageKey });
        if (isMounted) setImgSrc(downloadUrl);
      } catch (err) {
        console.error("Failed to fetch secure image link", err);
        if (isMounted) setImgSrc(null); // Clear src on error
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (storageKey) {
        getSecureUrl();
      } else {
        setLoading(false);
        setImgSrc(null); // No storageKey means no image to fetch
      }
    return () => { isMounted = false; };
  }, [storageKey]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading Secure Preview...</div>;
  const finalSrc = imgSrc || DEFAULT_AVATAR;
  const imageElement = (<img
    src={finalSrc}
    alt={alt}
    className={className}
    loading="lazy"
    onError={(e) => {
      e.target.src = DEFAULT_AVATAR; // Fallback on load error
    }}
    {...props}
  />);

  if (isLink && imgSrc) {
    return (
      <a href={imgSrc} target="_blank" rel="noopener noreferrer" className="inline-block">
        {imageElement}
      </a>
    );
  }
//   if (!imgSrc) return <div className="error">⚠️ Image unavailable</div>;

return imageElement;
}