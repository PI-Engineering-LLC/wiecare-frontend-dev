
import { api } from "@/api/apiClient";
import { debounce } from "lodash";
import { useEffect, useState , useRef } from "react";
import ReactPlayer from "react-player";

export default function  CourseVideo({ videoKey, onLoadedMetadata, onVideoDuration, watchTimeSeconds }) {
  const [url, setUrl] = useState(null);
  const playerRef = useRef(null); // Ref to access ReactPlayer instance
  // Use a ref to store the timestamp of the LAST time we sent an API save
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
      }
    }

    resolveVideo();
  }, [videoKey]);

  // Function to handle progress updates
    const handleProgress = (e) => {
    console.log("Current watch time:", e.currentTarget.currentTime);
    console.log("Current watch duration:", e.currentTarget.duration);
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
    // Call your backend API here
    if (onLoadedMetadata) {
      console.log("!!!!!!!!",seconds)
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
    console.log("Jump: ##", hasJumped,watchTimeSeconds)
    // Check if we have a saved time and the player instance is ready
    if (!hasJumped.current && watchTimeSeconds !== undefined && watchTimeSeconds >0 && playerRef.current) {
      const seconds = watchTimeSeconds ;
      console.log("Seconds: ##", seconds)
      // playerRef.current.seekTo(seconds)
      //playerRef.current.seekTo(seconds, 'seconds');
    // if(!!seconds) 
      playerRef.current.currentTime= seconds;;
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
      // className="w-full h-full"
      autoPlay
      // playing={true}
      // muted={true}
      onProgress={handleProgress}
      // onLoadedMetadata={handleProgress}
      onPause={handlePause}        
        onEnded={handleEnded}
        // onLoadedMetadata={handleDuration} 
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
// import { api } from "@/api/apiClient";
// import { debounce } from "lodash";
// import { useEffect, useState, useRef } from "react";
// import ReactPlayer from "react-player";

// export default function CourseVideo({ videoKey, onLoadedMetadata, onVideoDuration, watchTimeSeconds }) {
//   const [url, setUrl] = useState(null);
//   const playerRef = useRef(null);
//   const lastSavedTimeRef = useRef(0);

//   useEffect(() => {
//     async function resolveVideo() {
//       if (videoKey.startsWith("http://") || videoKey.startsWith("https://")) {
//         setUrl(videoKey);
//         return;
//       }
//       try {
//         const { downloadUrl } = await api.getS3FileUrl({ fileKey: videoKey });
//         setUrl(downloadUrl);
//       } catch (err) {
//         console.error("Video resolve error:", err);
//       }
//     }
//     resolveVideo();
//   }, [videoKey]);

//   const saveWatchTime = debounce((seconds) => {
//     if (onLoadedMetadata) {
//       onLoadedMetadata(seconds);
//     }
//     lastSavedTimeRef.current = seconds;
//   }, 3000); // Reduced to 3s for better responsiveness during testing

//   const handleProgress = (state) => {
//     const { playedSeconds } = state;
//     if (Math.abs(playedSeconds - lastSavedTimeRef.current) >= 30) {
//       saveWatchTime(playedSeconds);
//     }
//   };

//   const handleReady = () => {
//     // Ensure we have a valid number and the player is ready
//     if (watchTimeSeconds !== undefined && watchTimeSeconds !== null && playerRef.current) {
//       const seconds = Number(watchTimeSeconds);
//       if (seconds > 0) {
//         playerRef.current.seekTo(seconds, 'seconds');
//       }
//     }
//   };
//   const handleDuration = (durationInSeconds) => { //  handler for duration
//     if (onVideoDuration) {
//       onVideoDuration(durationInSeconds);
//     }
//   };

//   if (!url) return <div>Loading video...</div>;

//   return (
//     <ReactPlayer
//       ref={playerRef}
//       src={url} 
//       controls
//       width="100%"
//       height="100%"
//       onProgress={handleProgress}
//       // onDuration={(d) => onVideoDuration?.(d)}
//       onLoadedMetadata={handleDuration} 
//       onReady={handleReady}
//     />
//   );
// }