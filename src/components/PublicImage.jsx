const BASE_URL = import.meta.env.VITE_APP_ASSETS_BASE_URL;
import defaultImg from '@/assets/logo/wiecare_logo.png'; 

export const PublicImage = ({ docKey, alt = "user file", className = "", isLink = false,onError=null, ...props }) => {

  const fallbackUrl = defaultImg;
  const src = docKey  ? `${BASE_URL}/${docKey}` : fallbackUrl; 

  const imageElement = (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy" // Native browser performance optimization
      onError={(e) => {
        e.target.onError=null
        if (typeof onError === 'function') {
          onError(e);
        }
        e.target.src = fallbackUrl;
        
      }}
      {...props}
    />
  );
  if (isLink && src !== fallbackUrl) {
    return (
      
        <a href={src} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
        {imageElement}
        </a>
     
    )


  }
  return imageElement;
}

