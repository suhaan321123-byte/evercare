import React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X } from "lucide-react";
import Image from "next/image";

const ImageViewer = ({ src, isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-[90vh] h-full p-0">
        <div className="relative w-full h-full">
          {/* Use Image component from next/image with proper width and height */}
          <Image
            src={src}
            alt="Full-screen view"
            layout="fill"
            objectFit="contain" // Ensures the image fits within the container
            className="w-full h-full p-5"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-75 transition-opacity"
          >
            <X size={24} />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageViewer;
