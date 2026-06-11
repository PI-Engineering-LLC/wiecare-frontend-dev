import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { PrivateImageLink } from './PrivateImageLink';
const DEFAULT_AVATAR = '/wiecare-logo';

export function PrivateFileLink({ storageKey, label, alt = "Private File", className = "", showImage = false, ...props }) {
  const [fileHref, setFileHref] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function getSecureUrl() {
      try {
        setLoading(true);
        const { downloadUrl } = await api.getS3FileUrl({ storageKey });
        if (isMounted) setFileHref(downloadUrl);
      } catch (err) {
        console.error("Failed to fetch secure image link", err);
        if (isMounted) setFileHref(null); // Clear src on error
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (storageKey) {
        getSecureUrl();
      } else {
        setLoading(false);
        setFileHref(null); // No storageKey means no image to fetch
      }
    return () => { isMounted = false; };
  }, [storageKey]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading link...</div>;
  if (!fileHref) {
    return <span className="text-sm text-red-500">⚠️ File unavailable</span>;
  }

  return (
    <>
    // <a href={fileHref} target="_blank" rel="noopener noreferrer" className={className} {...props}>
      {showImage && storageKey ? (
        // If showImage is true, try to render it as a PrivateImage.
        // This implicitly assumes it is an image file.
        <PrivateImageLink storageKey={storageKey} alt={alt} className="max-w-full h-auto" />
      ) : (
        <a href={fileHref} target="_blank" rel="noopener noreferrer" className={className} {...props}>label || storageKey || 'Download Private File'</a>
      )}
    // </a>
    </>
  );
}