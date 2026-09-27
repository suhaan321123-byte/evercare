"use client";

import { Fragment } from "react";
import {
  XCircle,
  CheckCircle,
  ShieldAlert,
  AlertTriangle,
  Info,
} from "lucide-react";

export default function Toast({ snackbar, setSnackbar }) {
  const { open, message, severity } = snackbar;

  if (!open) return null;

  const getIcon = () => {
    switch (severity) {
      case "success":
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case "error":
        return <ShieldAlert className="w-6 h-6 text-red-500" />;
      case "warning":
        return <AlertTriangle className="w-6 h-6 text-orange-500" />;
      case "info":
      default:
        return <Info className="w-6 h-6 text-blue-500" />;
    }
  };

  const getBgColor = () => {
    switch (severity) {
      case "success":
        return "bg-green-100 dark:bg-green-800";
      case "error":
        return "bg-red-100 dark:bg-red-800";
      case "warning":
        return "bg-orange-100 dark:bg-orange-700";
      case "info":
      default:
        return "bg-blue-100 dark:bg-blue-800";
    }
  };

  const getTextColor = () => {
    switch (severity) {
      case "success":
        return "text-green-800 dark:text-green-200";
      case "error":
        return "text-red-800 dark:text-red-200";
      case "warning":
        return "text-orange-800 dark:text-orange-200";
      case "info":
      default:
        return "text-blue-800 dark:text-blue-200";
    }
  };

  return (
    <div
      className={`fixed top-5 right-5 flex items-center max-w-xs w-full p-4 rounded-lg shadow-lg   transform transition-all duration-300 ease-out
        animate-[toast-slide-in_0.3s_ease-out] ${getBgColor()} transition-all duration-300 z-50`}
      role="alert"
    >
      <div className="flex-shrink-0">{getIcon()}</div>
      <div className={`ml-3 text-sm font-medium ${getTextColor()}`}>
        {message}
      </div>
      <button
        type="button"
        className="ml-auto p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
        onClick={() => setSnackbar({ ...snackbar, open: false })}
      >
        <XCircle className="w-5 h-5 text-gray-500 dark:text-gray-200" />
      </button>
    </div>
  );
}
