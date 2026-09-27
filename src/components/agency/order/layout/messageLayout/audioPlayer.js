import React, { useRef, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import getBlobDuration from "get-blob-duration";

const AudioPlayer = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleBlobDuration = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const result = await getBlobDuration(blob);
      setDuration(result);
    } catch (error) {
      console.error("Error fetching or calculating duration:", error);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current.duration === Infinity) {
      handleBlobDuration(src);
    } else {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSliderChange = (value) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const resetAudio = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
      audioRef.current.pause();
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-[400px] w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-lg shadow-md">
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      <div className="flex items-center gap-3 min-w-52">
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={togglePlay}
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </Button>
        <Slider
          value={[currentTime]}
          max={duration}
          step={0.1}
          onValueChange={handleSliderChange}
          className="flex-grow"
          thumbClassName="bg-blue-500 w-4 h-4 rounded-full shadow"
        />
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={resetAudio}
        >
          <RotateCcw size={24} />
        </Button>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-300 mt-2 text-right">
        {formatTime(currentTime)} / {formatTime(duration)}
      </div>
    </div>
  );
};

export default AudioPlayer;

// import React, { useRef, useState } from "react";
// import { Slider } from "@/components/ui/slider";
// import { Button } from "@/components/ui/button";
// import { Play, Pause, RotateCcw } from "lucide-react";
// import getBlobDuration from "get-blob-duration";

// const AudioPlayer = ({ src }) => {
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [currentTime, setCurrentTime] = useState(0);
//   const [duration, setDuration] = useState(0);
//   const audioRef = useRef(null);

//   // Toggle play/pause state
//   const togglePlay = () => {
//     if (audioRef.current) {
//       if (isPlaying) {
//         audioRef.current.pause();
//       } else {
//         audioRef.current.play();
//       }
//       setIsPlaying(!isPlaying);
//     }
//   };

//   // Update the current time when audio is playing
//   const handleTimeUpdate = () => {
//     if (audioRef.current) {
//       setCurrentTime(audioRef.current.currentTime);
//     }
//   };

//   const handleBlobDuration = async (url) => {
//     try {
//       const response = await fetch(url);
//       const blob = await response.blob();
//       const result = await getBlobDuration(blob);
//       setDuration(result);
//     } catch (error) {
//       console.error("Error fetching or calculating duration:", error);
//     }
//   };

//   // Set the audio duration when it's loaded
//   const handleLoadedMetadata = () => {
//     if (audioRef.current.duration == "Infinity") {
//       handleBlobDuration(src);
//     } else {
//       setDuration(audioRef.current.duration);
//     }
//   };

//   // Handle slider change to update the audio's current time
//   const handleSliderChange = (value) => {
//     if (audioRef.current) {
//       audioRef.current.currentTime = value[0];
//       setCurrentTime(value[0]);
//     }
//   };

//   // Reset the audio to the start
//   const resetAudio = () => {
//     if (audioRef.current) {
//       audioRef.current.currentTime = 0;
//       setCurrentTime(0);
//       setIsPlaying(false);
//     }
//   };

//   // Format time into minutes:seconds
//   const formatTime = (time) => {
//     const minutes = Math.floor(time / 60);
//     const seconds = Math.floor(time % 60);
//     return `${minutes}:${seconds.toString().padStart(2, "0")}`;
//   };

//   return (
//     <div className="max-w-[400px] h-fit text-sm bg -red-300">
//       <audio
//         ref={audioRef}
//         src={src}
//         onTimeUpdate={handleTimeUpdate}
//         onLoadedMetadata={handleLoadedMetadata}
//         onEnded={() => setIsPlaying(false)}
//       />

//       <div className=" min-w-52">
//         <div className="flex gap-2 justify-start items-center -mt-2">
//           <Button
//             variant="ghost"
//             size="lg"
//             className="text-white hover:bg- gray-700 p-3 rounded-full"
//             onClick={togglePlay}
//           >
//             {isPlaying ? (
//               <Pause
//                 className="hover:text-gray-900 text-red-600 bg-yellow-50"
//                 size={28}
//               />
//             ) : (
//               <Play className="hover:text-gray-900" size={28} />
//             )}
//           </Button>
//           <Slider
//             value={[currentTime]}
//             max={duration}
//             step={0.1}
//             onValueChange={handleSliderChange}
//             className="w-full h-0.5 bg-gray-600 rounded-full"
//             thumbClassName="bg-blue-500 w-4 h-4 rounded-full shadow-lg"
//           />

//           <Button
//             variant="ghost"
//             size="lg"
//             className="text-white hover:bg-gray-700 p-3 rounded-full"
//             onClick={resetAudio}
//           >
//             <RotateCcw size={28} />
//           </Button>
//         </div>
//         <div className="ml-12 -mt-2 text-white text-xs font-normal">
//           {formatTime(currentTime)} / {formatTime(duration)}
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AudioPlayer;
