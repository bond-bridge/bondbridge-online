import React from 'react';
import { Link } from 'react-router-dom';

const MobileAppDownload: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-purple-50 to-white dark:from-gray-900 dark:to-gray-800 px-4 py-10 w-[100vw]">
      {/* Logo */}
      <div className="mb-8 animate-pulse">
        <img 
          src="/logo.png" 
          alt="BondBridge Logo" 
          className="w-32 h-32 object-contain"
        />
      </div>
      
      {/* Main content */}
      <div className="text-center max-w-md mb-3">
        <h1 className="text-3xl font-bold mb-4">
          <span className="text-gray-800 dark:text-white">Experience</span> 
          <span className="grad ml-2">BondBridge</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          For the best experience, download our mobile app. Connect with friends, share moments, and build meaningful bonds on the go.
        </p>
        
        {/* App store buttons */}
        <div className="flex flex-row justify-center items-center gap-4">
          <Link to="#" className="transform transition-all hover:scale-105">
            <img 
              src="/assets/stores/appstore.svg" 
              alt="Download on App Store" 
              className="h-40 sm:h-40"
            />
          </Link>
          <Link to="https://play.google.com/store/apps/details?id=com.bondbridge.bondbridgeonline" className="transform transition-all hover:scale-105">
            <img 
              src="/assets/stores/googleplay.svg" 
              alt="Get it on Google Play" 
              className="h-40 sm:h-40"
            />
          </Link>
        </div>
      </div> 
    </div>
  );
};

export default MobileAppDownload; 