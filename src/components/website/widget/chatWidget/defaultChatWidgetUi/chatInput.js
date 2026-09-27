import React, { useRef, useState } from "react";
import { Send, Mic, Image, Trash2 } from "lucide-react";
import AudioRecorder from "./audioRecorder";
import {
  uploadFileToCloudinary,
  uploadImageApi,
} from "@/api/imageUpload/cloudinary/cloudinary";
import AlertModal from "@/components/ui/modal/alertModal";

const ChatInput = ({ handleSendMessage, primaryColor }) => {
  const [message, setMessage] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [load, setLoad] = useState(false);

  const [selectedClipboard, setSelectedClipboard] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const imageInputRef = useRef(null);

  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessageBtn();
    }
  };
  const handleAudioRecord = () => {
    setShowAudioRecorder(true);
  };
  const handleImageAttach = () => {
    // Simulate image attachment
  };
  const handleCancelAudio = () => {
    setShowAudioRecorder(false);
  };

  const handleSendMessageBtn = async () => {
    if (load) return;
    try {
      setLoad(true);
      if (selectedFile?.type === "image") {
        const response = await uploadImageApi(
          selectedFile?.file,
          `chat-widget/images`
        );
        if (response) {
          await handleSendMessage("image", response, caption);
          setCaption("");
          setSelectedFile(null);
        }
      } else if (selectedFile?.type === "document") {
        const { url, mimeType } = await uploadFileToCloudinary(
          selectedFile?.file,
          `chat-widget/document`
        );
        if (url) {
          await handleSendMessage("file", url, caption, mimeType);
          setCaption("");
          setSelectedFile(null);
        }
      } else {
        if (message.trim().length === 0) return;
        await handleSendMessage("text", message);
        setMessage("");
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message,
        severity: "error",
      });
    } finally {
      setTimeout(() => setLoad(false), 500);
    }
  };

  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const maxFileSizeMB = type === "image" ? 5 : 100; // 5MB for images, 100MB for others
    const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

    const validFileTypes = {
      image: ["image/jpeg", "image/png"],
      video: ["video/mp4", "video/mov", "video/avi", "video/mkv", "video/webm"],
      document: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "application/zip",
        "application/x-rar-compressed",
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "video/mp4",
        "video/mov",
        "video/avi",
        "video/mkv",
        "video/webm",
        "audio/mpeg",
        "audio/wav",
        "audio/ogg",
        "audio/mp3",
      ],
      audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3"],
    };

    if (!validFileTypes[type].includes(file?.type)) {
      setSnackbar({
        open: true,
        message: `Invalid ${type} file type. Please select a valid ${type}.`,
        severity: "error",
      });
      return;
    }

    if (file.size > maxFileSizeBytes) {
      setSnackbar({
        open: true,
        message: `File size exceeds the maximum limit of ${maxFileSizeMB} MB.`,
        severity: "error",
      });
      return;
    }

    setSelectedFile({
      file,
      type,
    });
    setIsPopoverOpen(false);
    event.target.value = "";
  };

  const handleDeleteFile = () => {
    setSelectedFile(null); // Reset the selected file
  };

  return (
    <>
      {showAudioRecorder ? (
        <AudioRecorder
          onCancel={handleCancelAudio}
          primaryColor={primaryColor}
          handleSendMessage={handleSendMessage}
        />
      ) : (
        <>
          {selectedFile ? (
            <div className="w-full mb-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm transition-all duration-200">
              {selectedFile?.type === "image" && (
                <img
                  src={URL.createObjectURL(selectedFile?.file)}
                  alt="Preview"
                  className="w-full h-48 object-contain rounded-lg mb-3"
                />
              )}

              {selectedFile?.type === "document" && (
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/img/whatsapp/icons-document.png"
                    alt="Document Icon"
                    className="h-12 w-12"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {selectedFile?.file?.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(selectedFile?.file?.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}

              {load && (
                <div className="flex justify-center items-center py-3">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce [animation-delay:0.3s]"></div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                <button
                  className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition-colors duration-200"
                  onClick={handleDeleteFile}
                  title="Delete File"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption"
                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  onClick={handleSendMessageBtn}
                  disabled={load}
                  title="Send Message"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="w-full chat-input-container flex items-center gap-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-3xl p-2 transition-all duration-200"
              style={{ "--primary-color": primaryColor }}
            >
              <button
                className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors duration-200"
                onClick={() => imageInputRef.current?.click()}
                title="Attach Image"
              >
                <Image size={18} />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "image")}
              />

              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 p-2"
              />

              <button
                className="p-2 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors duration-200"
                onClick={() => setShowAudioRecorder(true)}
                title="Record Audio"
              >
                <Mic size={18} />
              </button>

              <button
                className="p-2 bg-[var(--primary-color)] hover:bg-[color-mix(in_srgb,var(--primary-color)_90%,black)] text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                onClick={handleSendMessageBtn}
                disabled={!message.trim()}
                title="Send Message"
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </>
      )}

      <AlertModal setSnackbar={setSnackbar} snackbar={snackbar} />
    </>
  );
};

export default ChatInput;
