
import { useState } from 'react';
import { api } from '@/api/apiClient';

export const usePrivateDocument = () => {
  const [loadingKey, setLoadingKey] = useState(null);
  const [error, setError] = useState(null);
  const handleSecureView = async (e, fileKey, download=false) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault(); // Intercept native anchor tag routing
    }
    if (!fileKey) return;

    setLoadingKey(fileKey);
    setError(null);
    try {
      const { downloadUrl } = await api.getS3FileUrl({ fileKey });

      // if(download){
      //   const response = await fetch(downloadUrl);
      //   const blob = await response.blob();
      //   const url = window.URL.createObjectURL(blob);
      //   const a = document.createElement("a");
      //   //a.setAttribute('download', ''); // Forces download if same-origin
      //   a.download = url;
      //   a.click();
      //   window.URL.revokeObjectURL(url);
      // }
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

      }
      
    }catch (err) {
      console.error('Failed to view secure document:', err);
      setError(err.message);
      alert(err.message);
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
//const { handleSecureView, currentlyLoadingKey } = usePrivateDocument();
/**
 <a 
        href="#view" 
        onClick={(e) => handleSecureView(e, selectedInvoice.pdf_storage_key)}
        className="btn-secondary"
      >
        {isLoading ? 'Loading Safe S3 Session...' : 'Review My Uploaded ID Document'}
      </a>
 * 
 * <a
                    href="#view-document" 
                    onClick={(e) => handleSecureView(e, user.id_doc_key)}
                    style={{
                      color: user.id_doc_key ? '#0066cc' : '#cccccc',
                      pointerEvents: (!user.id_doc_key || currentlyLoadingKey !== null) ? 'none' : 'auto',
                      textDecoration: 'underline',
                      fontWeight: '500'
                    }}
                  >
                    {isThisRowLoading ? 'Authorizing Access...' : 'Download / View ID'}
                  </a> */


// export const PrivateDocumentLink = ({ fileKey, label = "View Document" }) => {
//   const [isGenerating, setIsGenerating] = useState(false);
//   const [documentUrl, setDocumentUrl] = useState();

//   const handleDownloadClick = async (e) => {
    
//     e.preventDefault(); // Stop normal link routing
//     if (!fileKey) return alert('No file.');
//     setIsGenerating(true);

//     try {
//         const { downloadUrl } = await api.getS3FileUrl({ fileKey });
//         setDocumentUrl(downloadUrl)

//       // Open the secure S3 link in a brand new tab safely
//       window.open(downloadUrl, '_blank', 'noopener,noreferrer');

//     } catch (err) {
//       alert(err.message);
//     } finally {
//       setIsGenerating(false);
//     }
//   };
//   return {handleDownloadClick };
// //   if (!fileKey) return <span style={{ color: 'gray' }}>No document uploaded</span>;

// //   return (
// //     <Button 
// //       variant="outline"
// //       size="sm" 
// //       className="flex-1"
// //       asChild
// //       onClick={handleDownloadClick} 
// //       disabled={isGenerating}
// //     //   className="btn-document-link"
// //     //   style={{ background: 'none', border: 'none', color: '#0066cc', textDecoration: 'underline', cursor: 'pointer' }}
// //     >
// //       {isGenerating ? 'Authenticating Access...' : label}
// //     </Button>
// //   );
// //onClick={(e) => handleDownloadClick(e, user.id, user.id_doc_key)}
// };