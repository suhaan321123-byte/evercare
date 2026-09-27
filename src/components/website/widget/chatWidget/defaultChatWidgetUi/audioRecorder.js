import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Trash2, Send, Loader2 } from "lucide-react";
import { uploadAudioApi } from "@/api/imageUpload/cloudinary/cloudinary";
import getBlobDuration from "get-blob-duration";

const AudioRecorder = ({ handleSendMessage, onCancel, primaryColor }) => {
  // uploadAudioApi, onUploadStart, onUploadComplete
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioRef = useRef(null);
  const chunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const playbackIntervalRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup intervals and media streams
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Try to use MP3 format if supported, fallback to default
      const options = {
        mimeType: "audio/webm;codecs=opus",
      };

      // Check if the mimeType is supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        delete options.mimeType;
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blobType = mediaRecorder.mimeType.includes("webm")
          ? "audio/webm"
          : "audio/mp3";
        const blob = new Blob(chunksRef.current, { type: blobType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Create audio element to get duration
        const audio = new Audio(url);
        // audio.onloadedmetadata = () => {
        //   setDuration(audio.duration);
        // };
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Unable to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }

      // Stop the media stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const playAudio = () => {
    if (audioUrl && !isPlaying) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (playbackIntervalRef.current) {
          clearInterval(playbackIntervalRef.current);
        }
      };

      audio.play();
      setIsPlaying(true);

      // Update current time during playback
      playbackIntervalRef.current = setInterval(() => {
        if (audioRef.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }, 100);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    }
  };

  const deleteRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setCurrentTime(0);
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const sendAudio = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    // if (onUploadStart) onUploadStart();

    try {
      if (uploadAudioApi) {
        // Use the provided upload API
        const cloudUrl = await uploadAudioApi(audioBlob, `chat-widget/audio`);
        if (cloudUrl) {
          // onSendAudio(cloudUrl, duration);
          await handleSendMessage("audio", cloudUrl);
        } else {
          console.error("Failed to upload audio.");
        }
      } else {
        // Fallback: send the blob directly
        // onSendAudio(audioBlob, duration);
        await handleSendMessage("audio", audioBlob);
      }
    } catch (error) {
      console.error("Error uploading audio:", error);
    } finally {
      setIsUploading(false);
      onCancel();
      // if (onUploadComplete) onUploadComplete();
    }
  };

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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  };

  return (
    <div
      className="audio-recorder w-full"
      style={{ "--primary-color": primaryColor || "#3b82f6" }}
    >
      {!audioBlob ? (
        // Recording Interface
        <div className="recording-interface">
          <div className="recording-controls">
            {!isRecording ? (
              <button className="record-button" onClick={startRecording}>
                <Mic size={20} />
                <span>Start Recording</span>
              </button>
            ) : (
              <div className="recording-active">
                <div className="recording-indicator">
                  <div
                    className={`recording-dot ${isPaused ? "paused" : ""}`}
                  />
                  <span className="recording-time">
                    {formatTime(recordingTime)}
                  </span>
                </div>
                <div className="recording-buttons">
                  <button className="pause-button" onClick={pauseRecording}>
                    {isPaused ? <Play size={16} /> : <Pause size={16} />}
                  </button>
                  <button className="stop-button" onClick={stopRecording}>
                    <Square size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
          {!isRecording && (
            <button className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
          )}
        </div>
      ) : (
        // Playback Interface
        <div className="playback-interface">
          <div className="audio-preview">
            <div className="audio-controls">
              <button
                className="play-pause-button"
                onClick={isPlaying ? pauseAudio : playAudio}
                disabled={isUploading}
              >
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>

              <div className="audio-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
                <div className="time-display">
                  <span>{formatTime(currentTime)}</span>
                  <span>/</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            </div>

            <div className="audio-actions">
              <button
                className="delete-button"
                onClick={deleteRecording}
                disabled={isUploading}
              >
                <Trash2 size={16} />
              </button>
              <button
                className="send-audio-button"
                onClick={sendAudio}
                disabled={isUploading}
              >
                {isUploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioRecorder;