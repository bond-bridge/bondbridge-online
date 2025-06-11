import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "./chatSlice";
import createProfileReducer from "./createProfileSlice";
import createGroupReducer from "./createGroupSlice";
import { TypedUseSelectorHook } from "react-redux";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import settingsReducer from "./settingsSlice";
import currentUserReducer from "./currentUserSlice";
import notificationsReducer from "./notificationsSlice";

export const store = configureStore({
  reducer: {
    chat: chatReducer,
    createProfile: createProfileReducer,
    createGroup: createGroupReducer,
    settings: settingsReducer,
    currentUser: currentUserReducer,
    notifications: notificationsReducer,
    // Add other reducers here
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
