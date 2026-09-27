declare namespace google {
  namespace maps {
    namespace places {
      class Autocomplete {
        constructor(inputField: HTMLInputElement, opts?: Record<string, unknown>);
        addListener(eventName: string, handler: () => void): void;
        getPlace(): PlaceResult;
      }

      interface PlaceResult {
        formatted_address?: string;
        geometry?: unknown;
        address_components?: google.maps.GeocoderAddressComponent[];
      }
    }

    interface GeocoderAddressComponent {
      long_name: string;
      short_name: string;
      types: string[];
    }

    namespace event {
      function clearInstanceListeners(instance: unknown): void;
    }
  }
}
