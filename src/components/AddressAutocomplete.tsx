import { useEffect, useRef, forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddressAutocompleteProps {
  id?: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
  className?: string;
}

declare global {
  interface Window {
    google: typeof google;
  }
}

const AddressAutocomplete = forwardRef<HTMLInputElement, AddressAutocompleteProps>(
  ({ id, label, placeholder, value, onChange, onPlaceSelect, className }, ref) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    useEffect(() => {
      // Check if Google Maps is loaded
      if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.warn("Google Maps API not loaded. Address autocomplete will not work.");
        return;
      }

      // Initialize autocomplete
      if (inputRef.current && !autocompleteRef.current) {
        autocompleteRef.current = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['address'], // Restrict to addresses only
            componentRestrictions: { country: 'in' }, // Restrict to India (you can change this)
            fields: ['formatted_address', 'geometry', 'address_components']
          }
        );

        // Add listener for place selection
        autocompleteRef.current.addListener('place_changed', () => {
          const place = autocompleteRef.current?.getPlace();
          if (place && place.formatted_address) {
            onChange(place.formatted_address);
            onPlaceSelect?.(place);
          }
        });
      }

      return () => {
        // Cleanup
        if (autocompleteRef.current) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    }, [onChange, onPlaceSelect]);

    // Update input value when prop changes
    useEffect(() => {
      if (inputRef.current && inputRef.current.value !== value) {
        inputRef.current.value = value;
      }
    }, [value]);

    return (
      <div className={className}>
        {label && <Label htmlFor={id}>{label}</Label>}
        <Input
          ref={ref || inputRef}
          id={id}
          type="text"
          placeholder={placeholder || "Start typing your address..."}
          defaultValue={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Start typing to see address suggestions from Google Maps
        </p>
      </div>
    );
  }
);

AddressAutocomplete.displayName = "AddressAutocomplete";

export default AddressAutocomplete;