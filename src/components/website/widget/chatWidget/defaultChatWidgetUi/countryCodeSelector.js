import { countryOptions } from "@/utils/countryOptions/countryOptions";
import React from "react";

const CountryCodeSelector = ({ countryCode, onChange }) => {
  return (
    <select
      value={countryCode}
      onChange={(e) => onChange(e.target.value)}
      className="country-selector"
    >
      {countryOptions.map((country, index) => (
        <option
          key={`${country?.code}-${country?.country}-${index}`}
          value={country?.code}
        >
          {country?.flag} {country?.code}
        </option>
      ))}
    </select>
  );
};

export default CountryCodeSelector;
