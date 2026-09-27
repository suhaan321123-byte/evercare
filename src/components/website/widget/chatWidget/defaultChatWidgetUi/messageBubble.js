import React, { useState, useMemo, memo, useCallback } from "react";
import { format, isToday, isYesterday } from "date-fns";
import Image from "next/image";
import ImageViewer from "@/components/agency/order/layout/messageLayout/imageViewer";
import AudioPlayer from "@/components/agency/order/layout/messageLayout/audioPlayer";
import FileMessage from "@/components/agency/order/layout/messageLayout/fileMessage";

// Create a memoized component for individual messages
const MessageItem = memo(({ chat, onImageClick }) => {
  const checkSender = (chat) => {
    if (!chat.senderId || !chat.clientId) {
      return true;
    }
    if (chat?.senderId == chat?.clientId) {
      return false;
    }
    return true;
  };

  const isFromMe = checkSender(chat);

  return (
    <div
      className={`flex w-full ${
        isFromMe ? "justify-start" : "justify-end"
      } mb-2`}
    >
      <div className="flex flex-col max-w-[80%]">
        {chat?.type === "component" ? (
          <div
            dangerouslySetInnerHTML={{ __html: chat?.message }}
            className="text-sm dark:text-gray-100 max-w-2xl"
          />
        ) : (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm max-w-sm">
            {(chat?.type === "text" || !chat?.type) && (
              <div className="text-sm whitespace-pre-wrap break-words dark:text-gray-100">
                {chat?.message}
              </div>
            )}

            {/* Audio Message */}
            {chat?.type === "audio" && <AudioPlayer src={chat?.message} />}

            {/* Image Message - Optimized */}
            {chat?.type === "image" && (
              <div>
                <div
                  className="cursor-pointer"
                  onClick={() => onImageClick(chat?.message)}
                >
                  <Image
                    src={chat?.message}
                    width={300}
                    height={300}
                    alt="Message"
                    className="w-48 h-48 object-cover rounded-lg"
                    loading="lazy"
                    unoptimized={true}
                    priority={false}
                  />
                </div>
                {chat?.caption && (
                  <div className="text-sm mt-1 break-words w-48 dark:text-gray-300">
                    {chat?.caption}
                  </div>
                )}
              </div>
            )}

            {/* File Message */}
            {chat?.type === "file" && (
              <FileMessage
                url={chat?.message}
                contentType={chat?.contentType || "application/octet-stream"}
              />
            )}

            {/* Video Message */}
            {chat?.type === "video" && (
              <div className="w-full max-w-xs">
                <video
                  controls
                  className="rounded-lg w-full h-auto max-h-[500px] object-cover"
                  src={chat?.message}
                >
                  Your browser does not support the video tag.
                </video>
                {chat?.caption && (
                  <div className="text-sm mt-1 break-words dark:text-gray-300">
                    {chat?.caption}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div
          className={`flex items-center mt-2 space-x-1 ${
            isFromMe
              ? "text-gray-500 dark:text-gray-400 justify-start"
              : "text-gray-500 dark:text-gray-400 justify-end"
          }`}
        >
          <span className="text-xs">
            {format(new Date(chat?.createdAt), "hh:mm a")}
          </span>
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = "MessageItem";

// Date Header Component
const DateHeader = memo(({ date }) => (
  <div className="flex justify-center mb-2">
    <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2 py-1 rounded-full">
      {formatDateHeader(new Date(date))}
    </span>
  </div>
));

DateHeader.displayName = "DateHeader";

// Main MessageBubble Component
const MessageBubble = ({ allMessages = [] }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  // Memoize grouped messages calculation
  const groupedMessages = useMemo(() => 
    groupMessagesByDate(allMessages),
    [allMessages] // Only recalculate when allMessages changes
  );

  // Memoize the image click handler
  const handleImageClick = useCallback((imageUrl) => {
    setSelectedImage(imageUrl);
  }, []);

  return (
    <div className="flex flex-col space-y-4">
      {Object.entries(groupedMessages).map(([date, messages]) => (
        <div key={date}>
          <DateHeader date={date} />
          
          {/* Messages */}
          {messages.map((chat) => (
            <MessageItem
              key={`${chat?._id}-${chat?.createdAt}`}
              chat={chat}
              onImageClick={handleImageClick}
            />
          ))}
        </div>
      ))}

      {/* Image Viewer Modal */}
      <ImageViewer
        src={selectedImage || ""}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
};

// Helper functions (should be outside component to prevent recreation)
function groupMessagesByDate(messages) {
  if (!messages || messages.length === 0) return {};
  
  return messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});
}

function formatDateHeader(date) {
  if (isToday(date)) {
    return "Today";
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, "MMMM d, yyyy");
  }
}

// Export memoized component with custom comparison
export default memo(MessageBubble, (prevProps, nextProps) => {
  // Only re-render if:
  // 1. Number of messages changed
  // 2. Last message is different
  const prevLast = prevProps.allMessages[prevProps.allMessages.length - 1];
  const nextLast = nextProps.allMessages[nextProps.allMessages.length - 1];
  
  if (prevProps.allMessages.length !== nextProps.allMessages.length) {
    return false; // Re-render if length changed
  }
  
  if (!prevLast || !nextLast) return true;
  
  // Check if last message is the same
  return prevLast._id === nextLast._id;
});