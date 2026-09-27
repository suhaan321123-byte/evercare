import React from "react";

export function AudioRecordingAnimation({ recordingTime }) {
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="relative w-3 h-3">
        <div className="absolute w-full h-full bg-red-500 rounded-full animate-ping"></div>
        <div className="absolute w-full h-full bg-red-500 rounded-full"></div>
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        Recording {formatTime(recordingTime)}
      </span>
    </div>
  );
}
