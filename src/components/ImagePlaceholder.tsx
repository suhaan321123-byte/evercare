import { Package } from "lucide-react";

type ImagePlaceholderProps = {
  label?: string;
  className?: string;
  iconClassName?: string;
};

const ImagePlaceholder = ({ label = "Image unavailable", className = "", iconClassName = "" }: ImagePlaceholderProps) => (
  <div
    aria-label={label}
    className={`flex h-full w-full items-center justify-center bg-muted text-primary/70 ${className}`}
  >
    <Package className={`h-8 w-8 ${iconClassName}`} aria-hidden="true" />
  </div>
);

export default ImagePlaceholder;
