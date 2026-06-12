import { useAuth } from "@/lib/AuthContext";
import { PublicImage } from "@/components/PublicImage";
// --- TODO:Centralize Constants ---
// Define these once, possibly in a `src/lib/constants.js` file,
// and import them into components that need them.
const BASE_URL = import.meta.env.VITE_APP_ASSETS_BASE_URL;


// For providing a download/view link to any public file.
// Can optionally embed a PublicImage for visual representation of an image file.
export const PublicFileLink = ({ docKey, label, alt = "File", className = "", showImage = false, ...props }) => {
  const { user } = useAuth();
  // Construct URL. Add cache buster.
  const href = docKey ? `${BASE_URL}/${docKey}?v=${user?.updated_at || ''}` : '#';

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} {...props}>
      {showImage && docKey ? (
        <PublicImage docKey={docKey} alt={alt} className="max-w-full h-auto" />
      ) : (
        label || docKey || 'Download File'
      )}
    </a>
  );
};