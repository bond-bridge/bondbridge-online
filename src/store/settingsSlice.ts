import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type SettingPage =
  | "profile"
  | "privacy"
  | "notifications"
  | "blocked"
  | "voice"
  | "help"
  | "account"
  | "referrals";

interface BlockedUser {
  id: string;
  name: string;
  avatar: string;
}

interface VoiceOption {
  id: string;
  name: string;
  preview: string;
}

interface SettingsState {
  isSettingsActive: boolean;
  activePage: SettingPage;
  selectedVoice: string;
  voiceOptions: VoiceOption[];
  blockedUsers: BlockedUser[];
  privacySettings: {
    isProfilePublic: boolean;
    showOnlineStatus: boolean;
    allowMessagesFromNonFriends: boolean;
  };
}

const initialState: SettingsState = {
  isSettingsActive: false,
  activePage: "profile",
  selectedVoice: "voice1",
  voiceOptions: [
    { id: "voice1", name: "Default Voice", preview: "/audio/sample.mp3" },
    { id: "voice2", name: "Deep Voice", preview: "/audio/sample.mp3" },
    { id: "voice3", name: "Soft Voice", preview: "/audio/sample.mp3" },
    { id: "voice4", name: "Energetic Voice", preview: "/audio/sample.mp3" },
    { id: "voice5", name: "Calm Voice", preview: "/audio/sample.mp3" },
    { id: "voice6", name: "Professional Voice", preview: "/audio/sample.mp3" },
  ],
  blockedUsers: [],
  privacySettings: {
    isProfilePublic: true,
    showOnlineStatus: true,
    allowMessagesFromNonFriends: true,
  },
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    setSettingsActive: (state, action: PayloadAction<boolean>) => {
      state.isSettingsActive = action.payload;
    },
    setActivePage: (state, action: PayloadAction<SettingPage>) => {
      state.activePage = action.payload;
    },
    setSelectedVoice: (state, action: PayloadAction<string>) => {
      state.selectedVoice = action.payload;
    },
    blockUser: (state, action: PayloadAction<BlockedUser>) => {
      const userExists = state.blockedUsers.some(
        (user) => user.id === action.payload.id
      );
      if (!userExists) {
        state.blockedUsers.push(action.payload);
      }
    },
    unblockUser: (state, action: PayloadAction<string>) => {
      state.blockedUsers = state.blockedUsers.filter(
        (user) => user.id !== action.payload
      );
    },
    updatePrivacySettings: (
      state,
      action: PayloadAction<Partial<typeof initialState.privacySettings>>
    ) => {
      Object.assign(state.privacySettings, action.payload);
    },
    resetSettings: () => initialState,
  },
});

export const {
  setSettingsActive,
  setActivePage,
  setSelectedVoice,
  blockUser,
  unblockUser,
  updatePrivacySettings,
  resetSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
