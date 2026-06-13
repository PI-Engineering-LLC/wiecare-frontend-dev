
import { api } from "@/api/apiClient";
import { debounce } from "lodash";
import { useEffect, useState, useRef } from "react";
import ReactPlayer from "react-player";

export default function CourseVideo({ videoKey, onLoadedMetadata, onVideoDuration, watchTimeSeconds,  onError }) {
  const [url, setUrl] = useState(null);
  const playerRef = useRef(null); // Ref to access ReactPlayer instance
  // Use a ref to store the timestamp of the last time we sent an API save
  const lastSavedTimeRef = useRef(0);
  const hasJumped = useRef(false);

  useEffect(() => {
    async function resolveVideo() {
      // youtube/vimeo/external mp4
      if (isExternalUrl(videoKey)) {
        setUrl(videoKey);
        return;
      }
      // otherwise assume S3 object key
      try {
        const { downloadUrl } = await api.getS3FileUrl({ fileKey: videoKey });
        setUrl(downloadUrl);
      } catch (err) {
        console.error(err);
        onError(err);
      }
    }

    resolveVideo();
  }, [videoKey]);

  // Function to handle progress updates
  const handleProgress = (e) => {
    const currentTime = e.currentTarget.currentTime;
    // Check if the user has watched 30 seconds MORE than our last saved timestamp
    const timeSinceLastSave = Math.abs(currentTime - lastSavedTimeRef.current);
    handleDuration(e.currentTarget.duration)

    if (timeSinceLastSave >= 30) {
      saveWatchTime(currentTime);
    }
  };
  // Pause Handler (Guarantees no progress is lost if they walk away)
  const handlePause = () => {
    if (playerRef.current) {
      const currentTime = playerRef.current.duration;
      saveWatchTime(currentTime);
    }
  };

  // Ended Handler (Marks completion precisely)
  const handleEnded = () => {
    if (playerRef.current) {
      const duration = playerRef.current.duration;
      saveWatchTime(duration); // Save the absolute max length
    }
  };

  // Function to save watch time to backend 
  const saveWatchTime = debounce((seconds) => {
    if (onLoadedMetadata) {
      onLoadedMetadata(seconds); // Pass seconds to the parent
    }
    lastSavedTimeRef.current = seconds;
  }, 300); // Save every 0.3 seconds after user stops seeking/playing

  const handleDuration = (durationInSeconds) => { //  handler for duration
    if (onVideoDuration) {
      onVideoDuration(durationInSeconds);
    }
  };
  const handleReady = () => {
    // Check if we have a saved time and the player instance is ready
    if (!hasJumped.current && watchTimeSeconds !== undefined && watchTimeSeconds > 0 && playerRef.current) {
      const seconds = watchTimeSeconds;
      playerRef.current.currentTime = seconds;;
      hasJumped.current = true;
    }
  };

  if (!url) {
    return <div>Loading video...</div>;
  }


  return (
    <ReactPlayer
      ref={playerRef}
      src={url}
      controls
      width="100%"
      height="100%"
      autoPlay
      onProgress={handleProgress}
      onPause={handlePause}
      onEnded={handleEnded}
      onReady={handleReady}
    />
  );
}

function isExternalUrl(value) {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://")
  );
}
