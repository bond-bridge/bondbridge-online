import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
// import IntlTelInput from "react-intl-tel-input";
// import "react-intl-tel-input/dist/main.css";
import { loginUser } from "../apis/commonApiCalls/authenticationApi";
import { useApiCall } from "../apis/globalCatchError";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoginResponse } from "../apis/apiTypes/response";
import { useDispatch } from "react-redux";
import { updateCurrentUser } from "../store/currentUserSlice";
import { Eye, EyeOff } from "lucide-react";
import { CustomPhoneInput } from "@/components/ui/custom-phone-input";

// Custom styles for the phone input component that change with theme
// const customPhoneInputStyles = `
//   /* Theme Styles */
//   .intl-tel-input .country-list {
//     background-color: var(--background);
//     color: var(--foreground);
//     border-color: var(--border);
//     box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
//   }
  
//   .intl-tel-input .country-list .country {
//     color: var(--foreground);
//   }
  
//   .intl-tel-input .country-list .country.highlight {
//     background-color: var(--muted);
//   }
  
//   .intl-tel-input .country-list .country .dial-code {
//     color: var(--muted-foreground);
//   }
  
//   .intl-tel-input .selected-flag {
//     background-color: transparent;
//   }

//   .intl-tel-input.allow-dropdown .flag-container:hover .selected-flag {
//     background-color: var(--muted);
//   }
  
//   .intl-tel-input.allow-dropdown.separate-dial-code .selected-flag {
//     background-color: var(--muted);
//   }
  
//   .intl-tel-input .selected-dial-code {
//     color: var(--foreground);
//     padding-left: 10px; /* Add padding between flag and country code */
//   }
  
//   .intl-tel-input input {
//     background-color: var(--background);
//     color: var(--foreground);
//     border-color: var(--border);
//   }
  
//   .intl-tel-input input:focus {
//     border-color: var(--ring);
//     box-shadow: 0 0 0 2px var(--ring);
//   }

//   .intl-tel-input .country-list .divider {
//     border-bottom-color: var(--border);
//   }
  
//   /* Fix spacing between flag and dial code */
//   .intl-tel-input.separate-dial-code .selected-flag {
//     padding-right: 6px !important;
//   }
  
//   .intl-tel-input.separate-dial-code .selected-dial-code {
//     margin-left: 6px !important;
//   }
// `;

const Login: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("1"); // Default to USA (dial code "1")
  const [, setIsValidPhone] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  // const phoneInputRef = useRef(null); // No longer needed for CustomPhoneInput unless specific direct manipulation is required
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [passwordType, setPasswordType] = useState("password");

  // Use our custom hook for API calls
  const [executeLogin, isLoggingIn] = useApiCall(loginUser);

  // Add effect to apply styles to the phone input after it's rendered
  // useEffect(() => {
  //   // Apply custom theme styles
  //   const styleElement = document.createElement("style");
  //   styleElement.textContent = customPhoneInputStyles;
  //   document.head.appendChild(styleElement);

  //   const fixPhoneInputStyles = () => {
  //     const container = document.querySelector(".intl-tel-input");
  //     if (container) {
  //       // Make width consistent
  //       container.setAttribute(
  //         "style",
  //         "width: 100% !important; height: 40px !important;"
  //       );

  //       // Fix flag container height
  //       const flagContainer = container.querySelector(".flag-container");
  //       if (flagContainer) {
  //         flagContainer.setAttribute("style", "height: 100% !important;");
  //       }

  //       // Fix selected flag height
  //       const selectedFlag = container.querySelector(".selected-flag");
  //       if (selectedFlag) {
  //         selectedFlag.setAttribute(
  //           "style",
  //           "height: 100% !important; display: flex !important; align-items: center !important;"
  //         );
  //       }

  //       // Fix selected dial code (country code) spacing
  //       const selectedDialCode = container.querySelector(".selected-dial-code");
  //       if (selectedDialCode) {
  //         selectedDialCode.setAttribute(
  //           "style",
  //           "margin-left: 6px !important; padding-left: 0 !important;"
  //         );
  //       }

  //       // Fix input height
  //       const input = container.querySelector("input");
  //       if (input) {
  //         input.setAttribute(
  //           "style",
  //           "height: 40px !important; background-color: var(--background) !important; color: var(--foreground) !important; border-color: var(--border) !important;"
  //         );
  //         input.classList.add(
  //           "border",
  //           "border-input",
  //           "rounded-md",
  //           "shadow-sm",
  //           "focus:outline-none",
  //           "focus:ring-ring",
  //           "focus:border-ring"
  //         );
  //       }
  //     }
  //   };

  //   // Run initially and after a small delay to ensure component is rendered
  //   fixPhoneInputStyles();
  //   const timeoutId = setTimeout(fixPhoneInputStyles, 100);

  //   return () => {
  //     clearTimeout(timeoutId);
  //     if (document.head.contains(styleElement)) {
  //      document.head.removeChild(styleElement);
  //     }
  //   };
  // }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const validCountryCode = "+" + countryCode;

    const result = await executeLogin({
      phoneNumber,
      countryCode: validCountryCode,
      password,
    });

    if (!result.success) {
      setAuthError(
        "Invalid Credentials. Please check your Phone Number and Password."
      );
      return;
    }

    const data = result.data as LoginResponse;

    // Store the same data in Redux
    dispatch(
      updateCurrentUser({
        userId: data.userDetails._id,
        token: data.token,
        username: data.userDetails.name || "",
        email: data.userDetails.email || "",
        avatar: data.userDetails.avatar || data.userDetails.profilePic || "",
      })
    );

    if (data.userDetails.statusCode != 0) {
      navigate("/");
    }
  };

  const handlePhoneChange = (
    isValid: boolean,
    value: string,
    selectedCountryData: { dialCode?: string }
  ) => {
    setIsValidPhone(isValid);
    if (selectedCountryData && selectedCountryData.dialCode) {
      setCountryCode(selectedCountryData.dialCode);
    }

    // Remove the country code from the phone number
    if (selectedCountryData && selectedCountryData.dialCode) {
      const dialCode = String(selectedCountryData.dialCode);
      let cleanNumber = value.replace(/\D/g, "");

      // If number starts with the dial code, remove it
      if (cleanNumber.startsWith(dialCode)) {
        cleanNumber = cleanNumber.substring(dialCode.length);
      }

      setPhoneNumber(cleanNumber);
    } else {
      setPhoneNumber(value.replace(/\D/g, ""));
    }
  };

  return (
    <>
      <AuthLayout
        title={
          <div className="text-nowrap">
            Welcome Back, Your <br /> Friends Are Waiting
          </div>
        }
        subtitle="Log in to unlock a world of endless possibilities"
        image="/auth/login.png"
        isLogin
      >
        <form
          onSubmit={handleSubmit}
          className="relative space-y-4 flex flex-col items-center"
        >
          <div className="flex flex-col justify-start w-full">
            <Label
              htmlFor="phoneNumber"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Phone
            </Label>
            <div className="relative">
              {/* <IntlTelInput
                ref={phoneInputRef}
                containerClassName="intl-tel-input"
                inputClassName="form-control w-full h-10 px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring"
                defaultCountry={"us"}
                preferredCountries={["us"]}
                onPhoneNumberChange={handlePhoneChange}
                onPhoneNumberBlur={handlePhoneChange}
                format={true}
                formatOnInit={true}
                autoPlaceholder={true}
                nationalMode={false}
                separateDialCode={true}
              /> */}
              <CustomPhoneInput
                value={phoneNumber}
                onChange={handlePhoneChange}
                defaultCountryCode={countryCode} // Pass the dial code, e.g., "1"
                placeholder="Enter phone number"
              />
            </div>
          </div>
          <div className="flex flex-col justify-start w-full">
            <Label
              htmlFor="password"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                type={passwordType}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full h-10 pr-7 px-3 py-2 border border-input rounded-md shadow-sm focus:outline-none focus:ring-ring focus:border-ring"
                required
              />
              <Button
                type="button"
                variant={"ghost"}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground cursor-pointer"
                style={{ top: "4px" }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setPasswordType(passwordType === "password" ? "text" : "password");
                }}
              >
                {passwordType === "password" ? <Eye /> : <EyeOff />}
              </Button>
            </div>
            {authError && (
              <div className="mt-2 text-sm text-foreground font-semibold">
                {authError}
              </div>
            )}
          </div>
          <div className="flex justify-end w-full">
            <Link
              to="/forgot-password"
              className="text-sm text-foreground hover:text-muted-foreground"
            >
              Forgot Password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full cursor-pointer"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? "Logging In..." : "Log In"}
          </Button>
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex justify-center pt-4">
              {/* <p className="text-md text-center text-muted-foreground">Get the app:</p> */}
              <div className="flex justify-center gap-4">
                <Link to="#" className="">
                  <img
                    src="/assets/stores/appstore.svg"
                    alt="Download on App Store"
                    className="w-40"
                  />
                </Link>
                <Link to="https://play.google.com/store/apps/details?id=com.bondbridge.bondbridgeonline" className="">
                  <img
                    src="/assets/stores/googleplay.svg"
                    alt="Get it on Google Play"
                    className="w-40"
                  />
                </Link>
              </div>
            </div>
          </div>
        </form>
      </AuthLayout>
    </>
  );
};

export default Login;
