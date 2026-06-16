
import { useState } from 'react';
import { api } from '@/api/apiClient';

export const usePrivateDocument = () => {
  const [loadingKey, setLoadingKey] = useState(null);
  const [error, setError] = useState(null);
  const handleSecureView = async (e, fileKey, download=false) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault(); 
    }
    if (!fileKey) return;

    setLoadingKey(fileKey);
    setError(null);
    try {
      const result = await api.getS3FileUrl({ fileKey });
      
// if (!result?.downloadUrl) {
//   const err = new Error('FILE_MISSING_IN_STORAGE');
//   err.code = 'FILE_MISSING_IN_STORAGE';
//   err.status = 404;
//   console.log("???", result, result?.ok, err)
//   throw err;
// }
const { downloadUrl } = result;
      if (download) {
        const response = await fetch(downloadUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        
        // Extract filename from fileKey (assuming fileKey is like "some/path/filename.ext")
        const filename = fileKey.split('/').pop(); 
        
        a.download = filename; 
        a.href = url;
        a.click();
        window.URL.revokeObjectURL(url);
      }
      else{
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
        // window.location.href = downloadUrl;

      }
      
    }catch (err) {
      console.error('Failed to view secure document:', err);
      setError(err.message);
      alert(err.message);
      // err.code = 'FILE_MISSING_IN_STORAGE';
      // // err.status = 404;
      // console.log("???", err)
      throw err;
    } finally {
      setLoadingKey(null);
    }

  }

  return {
    handleSecureView,
    isLoading: loadingKey !== null,
    // Helps identify precisely *which* row item is executing
    currentlyLoadingKey: loadingKey, 
    error
  };

}
