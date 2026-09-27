"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Trash2, Send } from "lucide-react";
import getBlobDuration from "get-blob-duration";

export default function AudioPreview({ audioUrl, onDelete, onSend, load }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

  const updateTime = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Update the current time and duration when the audio is loaded or playing
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.addEventListener("timeupdate", updateTime);
      audio.addEventListener("ended", () => setIsPlaying(false)); // Reset play state when audio ends
      return () => {
        audio.removeEventListener("timeupdate", updateTime);
        audio.removeEventListener("ended", () => setIsPlaying(false));
      };
    }
  }, [audioUrl]);

  // Handle blob duration by fetching the Blob data
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

  useEffect(() => {
    if (audioUrl) {
      handleBlobDuration(audioUrl);
    }
  }, [audioUrl]);

  // Toggle play/pause
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Format time in mm:ss format
  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  // Handle delete
  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  // Handle send
  const handleSend = () => {
    if (onSend) {
      onSend(audioUrl);
    }
  };

  return (
    <div className="flex w-full items-center space-x-4 bg-gray-100 dark:bg-gray-700 rounded-md px-4 py-2">
      {/* Audio Element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play/Pause Button */}
      <Button variant="ghost" size="icon" onClick={togglePlayPause}>
        {isPlaying ? (
          <Pause className="h-6 w-6 text-gray-700 dark:text-white" />
        ) : (
          <Play className="h-6 w-6 text-gray-700 dark:text-white" />
        )}
      </Button>

      {/* Progress Bar */}
      <div className="flex-grow">
        <div className="h-1 bg-gray-300 rounded-full">
          <div
            className="h-1 bg-blue-500 rounded-full"
            style={{
              width: `${(currentTime / duration) * 100}%`,
              transition: "width 0.1s ease-out", // Optional: Smooth transition
            }}
          ></div>
        </div>
      </div>

      {/* Time Display */}
      <span className="text-xs text-gray-500 dark:text-gray-400">
        {formatTime(currentTime)}/ {formatTime(duration)}
      </span>

      {/* Delete Button */}
      <Button variant="ghost" size="icon" onClick={handleDelete}>
        <Trash2 className="h-6 w-6 text-red-500" />
      </Button>

      {/* Send Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSend}
        disabled={load}
        className={`text-white ${
          load ? "bg-green-400" : "bg-green-500 hover:bg-green-600"
        }`}
      >
        {load ? (
          <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
        ) : (
          <Send className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
