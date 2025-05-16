import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import * as countryCodes from "country-codes-list";
import type { CountryProperty } from "country-codes-list";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

// Helper to get flag emoji by country code
/*
const getFlagEmoji = (countryCode: string): string => {
  if (!countryCode) return "🌐"; // Default globe emoji
  // Ensure countryCode is uppercase
  const upperCountryCode = countryCode.toUpperCase();
  // Convert country code to flag emoji
  // A -> 1F1E6, B -> 1F1E7, ..., Z -> 1F1FF
  // Calculate the Unicode Regional Indicator Symbols
  const codePoints = upperCountryCode
    .split("")
    .map((char) => 0x1f1e6 + (char.charCodeAt(0) - "A".charCodeAt(0)));
  return String.fromCodePoint(...codePoints);
};
*/

export interface Country {
  name: string;
  code: string;
  callingCode: string;
  // flag: string;
}

const countryDataMap: { [key: string]: string } = countryCodes.customList(
  "countryCode" as CountryProperty, // Use "countryCode" to key the map by country ISO codes
  "{countryNameEn}|{countryCode}|{countryCallingCode}" // Store these details in the value string
);

const allCountries: Country[] = Object.keys(countryDataMap).map(key => {
    const valueString = countryDataMap[key];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [name, _codeFromValue, callingCode] = valueString.split('|');
    // 'key' is the countryCode from the map's keys.
    return {
        name: name || 'Unknown',
        code: key, // Use the key from the map as the definitive country code
        callingCode: callingCode || '',
        // flag: getFlagEmoji(key), // Generate flag based on the key (country code)
    };
})
.filter(country => country.callingCode && country.name !== 'Unknown' && country.code) // Ensure essential data exists
.sort((a, b) => a.name.localeCompare(b.name));

// Mimic IntlTelInput's selectedCountryData structure for easier integration
export interface SimplifiedCountryData {
    dialCode: string;
    name: string;
    iso2: string; // Renamed from 'code' to match typical usage if IntlTelInput implies this
}

interface CustomPhoneInputProps {
  value?: string;
  onChange?: (
    isValid: boolean, 
    nationalNumber: string, 
    countryData: SimplifiedCountryData, 
    fullNumber: string
  ) => void;
  defaultCountryCode?: string; // ISO code e.g., "US"
  placeholder?: string;
  disabled?: boolean;
}

export const CustomPhoneInput = React.forwardRef<
  HTMLInputElement,
  CustomPhoneInputProps
>(
  (
    {
      value,
      onChange,
      defaultCountryCode = "US", // Prop can be an ISO code like "US" or a dial code like "1" after parent updates
      placeholder = "Phone number",
      disabled = false,
    },
    ref
  ) => {
    // Initializer for selectedCountry state
    const getInitialSelectedCountry = () => {
      const codeToLookup = defaultCountryCode?.toUpperCase();
      let country: Country | undefined;

      if (codeToLookup) {
        // Try matching as ISO code first (e.g., "US", "GB")
        country = allCountries.find(c => c.code.toUpperCase() === codeToLookup);
        if (!country) {
          // If not found as ISO, try matching as dial code (e.g., "1", "91")
          country = allCountries.find(c => c.callingCode === codeToLookup);
        }
      }
      // Fallback to US or the first country in the list
      return country || allCountries.find(c => c.code === "US") || allCountries[0];
    };

    const [selectedCountry, setSelectedCountry] = React.useState<Country | undefined>(getInitialSelectedCountry);

    // Initializer for nationalNumber state
    const getInitialNationalNumber = () => {
      // The `value` prop from Signup.tsx is the national number.
      return value ? value.replace(/\D/g, "") : "";
    };
    const [nationalNumber, setNationalNumber] = React.useState<string>(getInitialNationalNumber);

    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");

    // Effect to synchronize internal nationalNumber state with `value` prop changes
    React.useEffect(() => {
      const newNationalNumber = value ? value.replace(/\D/g, "") : "";
      if (newNationalNumber !== nationalNumber) {
        setNationalNumber(newNationalNumber);
      }
    }, [value]);

    // Effect to synchronize internal selectedCountry state with `defaultCountryCode` prop changes
    React.useEffect(() => {
      const codeToLookup = defaultCountryCode?.toUpperCase();
      let countryFoundFromProp: Country | undefined;

      if (codeToLookup) {
        countryFoundFromProp = allCountries.find(c => c.code.toUpperCase() === codeToLookup); // Try ISO
        if (!countryFoundFromProp) {
          countryFoundFromProp = allCountries.find(c => c.callingCode === codeToLookup); // Try dial code
        }
      }

      if (countryFoundFromProp) {
        // If prop resolves to a country, and it's different from current selected state, update.
        if (selectedCountry?.code !== countryFoundFromProp.code) {
          setSelectedCountry(countryFoundFromProp);
        }
      } else {
        // Prop is unresolvable or undefined.
        // If current selectedCountry is also undefined (e.g. initial mount with bad/no default from prop),
        // set a hardcoded default. Otherwise, leave selectedCountry as is.
        if (!selectedCountry && defaultCountryCode !== undefined) {
          setSelectedCountry(allCountries.find(c => c.code === "US") || allCountries[0]);
        }
      }
    }, [defaultCountryCode, selectedCountry]);

    const triggerOnChange = (currentNationalNum: string, country: Country | undefined) => {
      if (onChange && country) {
        const fullNum = `+${country.callingCode}${currentNationalNum}`;
        const countryData: SimplifiedCountryData = {
          dialCode: country.callingCode,
          name: country.name,
          iso2: country.code,
        };
        onChange(true, currentNationalNum, countryData, fullNum); // Passing true for isValid as placeholder
      }
    };

    const handleNationalNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newNationalNumber = e.target.value.replace(/\D/g, "");
      setNationalNumber(newNationalNumber);
      triggerOnChange(newNationalNumber, selectedCountry);
    };

    const handleCountrySelect = (country: Country) => {
      setSelectedCountry(country);
      triggerOnChange(nationalNumber, country);
      setIsDropdownOpen(false);
      setSearchTerm("");
    };

    const filteredCountries = React.useMemo(() => {
      if (!searchTerm) return allCountries;
      const lowerSearchTerm = searchTerm.toLowerCase();
      return allCountries.filter(
        (country) =>
          country.name.toLowerCase().includes(lowerSearchTerm) ||
          country.code.toLowerCase().includes(lowerSearchTerm) ||
          country.callingCode.includes(lowerSearchTerm)
      );
    }, [searchTerm, allCountries]);

    return (
      <div className="flex items-center">
        <Popover open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              role="combobox"
              aria-expanded={isDropdownOpen}
              className="max-w-[80px] justify-between rounded-r-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0"
              disabled={disabled}
            >
              {selectedCountry ? (
                <div className="flex items-center gap-1">
                  {/* <span className=" text-lg">{selectedCountry.flag}</span> */}
                  <span>+{selectedCountry.callingCode}</span>
                </div>
              ) : (
                "Select"
              )}
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[26indi0px] p-0">
            <Command shouldFilter={false}>
              <CommandInput
                placeholder="Search country..."
                value={searchTerm}
                onValueChange={setSearchTerm}
                className="h-10 text-sm border-x-0 border-t-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none px-3 border-b"
              />
              <CommandList>
                <ScrollArea className="h-[250px]">
                  <CommandEmpty className={cn(filteredCountries.length === 0 ? "py-6 text-center text-sm" : "hidden")}>
                    No country found.
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredCountries.map((country) => (
                      <CommandItem
                        key={country.code}
                        value={`${country.name} ${country.code} +${country.callingCode}`}
                        onSelect={() => handleCountrySelect(country)}
                        className="text-sm max-w-[250px]"
                      >
                       { selectedCountry?.code === country.code && <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                          )}
                        />}
                        {/* <span className="mr-1 text-lg">{country.flag}</span> */}
                        <span className="flex-1 truncate">{country.name}</span>
                        <span className="ml-1 text-muted-foreground">+{country.callingCode}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ScrollArea>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          ref={ref}
          type="tel"
          placeholder={placeholder}
          value={nationalNumber}
          onChange={handleNationalNumberChange}
          className="rounded-l-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 flex-1 min-w-0"
          disabled={disabled}
        />
      </div>
    );
  }
);

CustomPhoneInput.displayName = "CustomPhoneInput";

// Example usage (can be removed or moved to a storybook/docs):
/*
export function PhoneInputDemo() {
  const [phone, setPhone] = React.useState("");
  return (
    <div className="w-full max-w-sm">
      <CustomPhoneInput
        value={phone}
        onChange={(isValid, nationalNum, country, fullNum) => setPhone(fullNum)}
        defaultCountryCode="GB"
      />
      <p className="mt-2 text-sm text-muted-foreground">
        Entered value: {phone}
      </p>
    </div>
  );
}
*/ 