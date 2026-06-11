import { useAuth } from '@/lib/AuthContext';
const BASE_URL = import.meta.env.VITE_APP_ASSETS_BASE_URL;
const DEFAULT_AVATAR = '/wiecare-logo';

export const PublicImage = ({ docKey, alt = "user file", className = "", isLink = false, ...props }) => {

  const { user } = useAuth();
  // const src = docKey ? `${BASE_URL}/${docKey}?v=${user?.updated_at || ''}` : DEFAULT_AVATAR;
  const src = docKey  ? `${BASE_URL}/${docKey}`  : null; // Force the browser to bypass its cache when the key updates

  const imageElement = (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy" // Native browser performance optimization
      onError={(e) => {
        // Fallback in case the image was deleted or failed to load
        e.target.src = DEFAULT_AVATAR;
      }}
      {...props}
    />
  );
  if (isLink && src !== DEFAULT_AVATAR) {
    return (
      
        <a href={src} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
        {imageElement}
        </a>
     
    )


  }
  return imageElement;
}

