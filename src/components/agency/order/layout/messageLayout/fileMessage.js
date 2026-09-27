import React from "react";
import { File, FileText, Image, Video, Music, Download } from "lucide-react";

const FileMessage = ({ url, contentType }) => {
  let fileName = "Unknown file";
  if (url) {
    try {
      fileName = new URL(url).pathname.split("/").pop();
    } catch {
      fileName = "Invalid URL";
    }
  }

  const getFileIcon = () => {
    if (!contentType) return <File className="w-6 h-6 text-gray-600 dark:text-gray-300" />;
    switch (contentType.split("/")[0]) {
      case "image":
        return <Image className="w-6 h-6 text-purple-500 dark:text-purple-400" />;
      case "video":
        return <Video className="w-6 h-6 text-pink-500 dark:text-pink-400" />;
      case "audio":
        return <Music className="w-6 h-6 text-yellow-500 dark:text-yellow-300" />;
      case "application":
        return contentType.includes("pdf") ? (
          <FileText className="w-6 h-6 text-red-500 dark:text-red-400" />
        ) : (
          <File className="w-6 h-6 text-blue-500 dark:text-blue-400" />
        );
      default:
        return <File className="w-6 h-6 text-gray-600 dark:text-gray-300" />;
    }
  };

  return (
    <div className="flex items-center space-x-3 bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
      {getFileIcon()}
      <div className="flex-grow overflow-hidden">
        <p className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
          {fileName}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {contentType?.split("/")?.[0] || "Unknown type"}
        </p>
      </div>
      {url ? (
        <a
          href={url}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
          aria-label={`Download ${fileName}`}
        >
          <Download className="w-4 h-4" />
        </a>
      ) : (
        <div className="p-2 bg-gray-400 text-white rounded-full cursor-not-allowed">
          <Download className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default FileMessage;
