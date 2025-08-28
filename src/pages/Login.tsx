import { Button } from "@/components/ui/button";
import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout";
// import IntlTelInput from "react-intl-tel-input";
// import "react-intl-tel-input/dist/main.css";
import Captcha, { CaptchaHandle } from "@/components/auth/captcha";
import { CustomPhoneInput } from "@/components/ui/custom-phone-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useDispatch } from "react-redux";
import { LoginResponse } from "../apis/apiTypes/response";
import { loginUser } from "../apis/commonApiCalls/authenticationApi";
import { useApiCall } from "../apis/globalCatchError";
import { updateCurrentUser } from "../store/currentUserSlice";

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
  const [captchaSolved, setCaptchaSolved] = useState(false);
  const captchaRef = useRef<CaptchaHandle | null>(null);
  const honeypotRef = useRef<HTMLInputElement | null>(null);

  // Use our custom hook for API calls
  const [executeLogin, isLoggingIn] = useApiCall(loginUser);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!captchaSolved) {
      setAuthError("Please complete the CAPTCHA.");
      return;
    }
    if (honeypotRef.current && honeypotRef.current.value.trim().length > 0) {
      setAuthError("Invalid request.");
      return;
    }

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
      captchaRef.current?.reset();
      setCaptchaSolved(false);
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
                  setPasswordType(
                    passwordType === "password" ? "text" : "password"
                  );
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

          <div className="flex flex-col justify-start w-full">
            <Label className="block text-sm font-medium text-foreground mb-1">
              Verification
            </Label>
            <Captcha
              ref={captchaRef}
              onSolve={setCaptchaSolved}
              minSolveMs={1500}
            />
            <input
              ref={honeypotRef}
              name="company"
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />
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
            disabled={isLoggingIn || !captchaSolved}
          >
            {isLoggingIn
              ? "Logging In..."
              : !captchaSolved
              ? "Verify CAPTCHA"
              : "Log In"}
          </Button>
          <div className="flex flex-col items-center justify-center gap-1">
            <div className="flex justify-center pt-4">
              {/* <p className="text-md text-center text-muted-foreground">Get the app:</p> */}
              <div className="flex justify-center gap-4">
                <Link
                  to="https://apps.apple.com/in/app/bondbridge-ai/id6745119162"
                  className=""
                >
                  <img
                    src="/assets/stores/appstore.svg"
                    alt="Download on App Store"
                    className="w-40"
                  />
                </Link>
                <Link
                  to="https://play.google.com/store/apps/details?id=com.bondbridge.bondbridgeonline"
                  className=""
                >
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
