import apiClient from '@/apis/apiClient';
import {
  SendOTPRequest,
  VerifyOTPRequest,
  LoginRequest,
  SetPasswordRequest,
} from '../apiTypes/request';
import {
  SendOTPResponse,
  VerifyOTPResponse,
  LoginResponse,
  SetPasswordResponse,
} from '../apiTypes/response';

// Define proper types for request bodies
type SendOTPRequestBody = {
  phoneNumber: string;
  countryCode: string;
  forgot?: string;
};

type VerifyOTPRequestBody = {
  phoneNumber: string;
  countryCode: string;
  otp: string;
  forgot?: string;
};

// Function to send OTP for signup or forgot password
export const sendOTP = async (phoneData: SendOTPRequest): Promise<SendOTPResponse> => {
  const { phoneNumber, countryCode, forgot } = phoneData;
  
  // Validate required fields
  if (!phoneNumber || !countryCode) {
    throw new Error('Phone number and country code are required');
  }
  
  // Include forgot parameter if provided
  const requestBody: SendOTPRequestBody = { phoneNumber, countryCode };
  if (forgot) {
    requestBody.forgot = forgot;
  }
  
  const response = await apiClient.post<SendOTPResponse>(`/send-otp`, requestBody);
  
  if (response.status === 200) {
    console.log(response.data);
    return response.data;
  } else {
    throw new Error(response.data.message || 'Failed to send OTP');
  }
};

// Function to verify OTP
export const verifyOTP = async (otpData: VerifyOTPRequest): Promise<VerifyOTPResponse> => {
  const { phoneNumber, countryCode, otp, forgot } = otpData;
  
  // Validate required fields
  if (!phoneNumber || !countryCode || !otp) {
    throw new Error('Phone number, country code, and OTP are required');
  }
  
  // Include forgot parameter if provided
  const requestBody: VerifyOTPRequestBody = { phoneNumber, countryCode, otp };
  if (forgot) {
    requestBody.forgot = forgot;
  }
  
  const response = await apiClient.post<VerifyOTPResponse>(`/verify-otp`, requestBody);
  
  if (response.status === 200) {
    console.log(response.data);
    
    // Store token and userId in localStorage
    if (response.data.token && response.data.userDetails?._id) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userDetails._id);
    }
    
    return response.data;
  } else {
    throw new Error(response.data.message || 'Failed to verify OTP');
  }
};

// Function to login with phone and password
export const loginUser = async (loginData: LoginRequest): Promise<LoginResponse> => {
  const { phoneNumber, countryCode, password } = loginData;
  
  // Validate required fields
  if (!phoneNumber || !countryCode || !password) {
    throw new Error('Phone number, country code, and password are required');
  }
  
  const response = await apiClient.post<LoginResponse>(`/login`, {
    phoneNumber,
    countryCode,
    password
  });
  
  if (response.status === 200) {
    console.log(response.data);
    
    if (response.data.token && response.data.userDetails?._id && response.data.userDetails.statusCode != 0) {
      localStorage.setItem('socketToken', response.data.socketToken)
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.userDetails._id);
    }
    
    return response.data;
  } else {
    throw new Error(response.data.message || 'Failed to login');
  }
};

// Function to set user password
export const setPassword = async (data: SetPasswordRequest): Promise<SetPasswordResponse> => {
  const { password } = data;
  
  // Validate required fields
  if (!password) {
    throw new Error('Password is required');
  }
  
  const response = await apiClient.put<SetPasswordResponse>(`/set-password`, {
    password,
  });
  
  if (response.status === 200) {
    console.log("Password set successfully:", response.data);
    
    // Check if response has token and userDetails properties (might be present but not in type)
    interface ExtendedPasswordResponse extends SetPasswordResponse {
      token?: string;
      userDetails?: { _id: string };
      socketToken?: string;
    }
    const extendedResponse = response.data as ExtendedPasswordResponse;
    if (extendedResponse.token && extendedResponse.userDetails?._id) {
      localStorage.setItem('token', extendedResponse.token);
      localStorage.setItem('userId', extendedResponse.userDetails._id);
      
      // Set socketToken if available
      if (extendedResponse.socketToken) {
        localStorage.setItem('socketToken', extendedResponse.socketToken);
      }
    }
    
    return response.data;
  } else {
    throw new Error(response.data.message || 'Failed to set password');
  }
};

// commented out for now as we are not using password reset

// Function to request password reset
// export const requestPasswordReset = async (resetData: { phoneNumber: string; countryCode: string }) => {
//   const { phoneNumber, countryCode } = resetData;
  
//   // Validate required fields
//   if (!phoneNumber || !countryCode) {
//     throw new Error('Phone number and country code are required');
//   }
  
//   const response = await apiClient.post(`/request-password-reset`, {
//     phoneNumber,
//     countryCode
//   });
  
//   if (response.status === 200) {
//     return response.data;
//   } else {
//     throw new Error(response.data.message || 'Failed to request password reset');
//   }
// };

// commented out for now as we are not using password reset

// Function to reset password
// export const resetPassword = async (resetData: { phoneNumber: string; countryCode: string; otp: string; newPassword: string }) => {
//   const { phoneNumber, countryCode, otp, newPassword } = resetData;
  
//   // Validate required fields
//   if (!phoneNumber || !countryCode || !otp || !newPassword) {
//     throw new Error('All fields are required');
//   }
  
//   const response = await apiClient.post(`/reset-password`, {
//     phoneNumber,
//     countryCode,
//     otp,
//     newPassword
//   });
  
//   if (response.status === 200) {
//     return response.data;
//   } else {
//     throw new Error(response.data.message || 'Failed to reset password');
//   }
// };
