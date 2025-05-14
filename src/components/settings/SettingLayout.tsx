import React from "react";
import { useAppSelector } from "@/store";
import EditProfilePage from "./EditProfilePage";
import BlockedUsersPage from "./BlockedUsersPage";
import VoiceSettingsPage from "./VoiceSettingsPage";
import LogoutDeletePage from "./LogoutDeletePage";
import PrivacySettingsPage from "./PrivacySettingsPage";
import ReferralsPage from "./ReferralsPage";

const SettingLayout: React.FC = () => {
  const { activePage } = useAppSelector((state) => state.settings);

  return (
    <div className="w-full h-[calc(100vh-64px)] border-l border-border flex flex-col relative">
      {/* Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activePage === "profile" && <EditProfilePage />}
        {activePage === "blocked" && <BlockedUsersPage />}
        {activePage === "voice" && <VoiceSettingsPage />}
        {activePage === "privacy" && <PrivacySettingsPage />}
        {activePage === "account" && <LogoutDeletePage />}
        {activePage === "referrals" && <ReferralsPage />}
      </div>
    </div>
  );
};

export default SettingLayout;
