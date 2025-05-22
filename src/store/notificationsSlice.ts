import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Definition for a single notification item
// Ideally, this would be imported from a shared types definition file
export interface ApiNotification {
  _id: string;
  type: string;
  sender: {
    id: string;
    name: string;
    profilePic: string;
  };
  receiverId: string;
  details: {
    notificationText: string;
    notificationImage: string;
    entityType: string;
    entityId: string;
    headerId: string;
    entity: {
      _id: string;
      feedId?: string;
      [key: string]: unknown;
    };
    content: string | null;
  };
  timestamp: string;
  seen: boolean;
}

// Shape of the notifications state
interface NotificationsState {
  unseenNotifications: ApiNotification[];
  seenNotifications: ApiNotification[];
  unseenCount: number;
}

const initialState: NotificationsState = {
  unseenNotifications: [],
  seenNotifications: [],
  unseenCount: 0,
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setInitialNotifications: (
      state,
      action: PayloadAction<{
        unseenItems: ApiNotification[];
        seenItems: ApiNotification[];
        initialUnseenCount: number;
      }>
    ) => {
      state.unseenNotifications = action.payload.unseenItems;
      state.seenNotifications = action.payload.seenItems;
      state.unseenCount = action.payload.initialUnseenCount;
    },
    setMoreNotifications: (
      state,
      action: PayloadAction<{
        unseenItems: ApiNotification[];
        seenItems: ApiNotification[];
      }>
    ) => {
      state.unseenNotifications.push(...action.payload.unseenItems);
      state.seenNotifications.push(...action.payload.seenItems);
      // unseenCount is assumed to be handled by API or another action if it changes here
    },
    markAsSeenInStore: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload;
      const notificationIndex = state.unseenNotifications.findIndex(
        (n) => n._id === notificationId
      );
      if (notificationIndex !== -1) {
        const notificationToMove = state.unseenNotifications.splice(
          notificationIndex,
          1
        )[0];
        notificationToMove.seen = true;
        state.seenNotifications.unshift(notificationToMove); // Add to the beginning of seen
        state.unseenCount = Math.max(0, state.unseenCount - 1);
      }
    },
    deleteNotificationFromStore: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload;
      const unseenIndex = state.unseenNotifications.findIndex(
        (n) => n._id === notificationId
      );
      if (unseenIndex !== -1) {
        state.unseenNotifications.splice(unseenIndex, 1);
        state.unseenCount = Math.max(0, state.unseenCount - 1);
      }
      const seenIndex = state.seenNotifications.findIndex(
        (n) => n._id === notificationId
      );
      if (seenIndex !== -1) {
        state.seenNotifications.splice(seenIndex, 1);
      }
    },
    clearAllStoredNotifications: (state) => {
      state.unseenNotifications = [];
      state.seenNotifications = [];
      state.unseenCount = 0;
    },
    // For optimistic update rollbacks
    revertNotificationDeletion: (state, action: PayloadAction<ApiNotification>) => {
      const notification = action.payload;
      if (notification.seen) {
        // Avoid duplicates if it was already restored or never removed
        if (!state.seenNotifications.find(n => n._id === notification._id)) {
          state.seenNotifications.push(notification);
          // Optional: sort seenNotifications by timestamp if needed upon rollback
          state.seenNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      } else {
        if (!state.unseenNotifications.find(n => n._id === notification._id)) {
          state.unseenNotifications.push(notification);
          state.unseenCount += 1;
          // Optional: sort unseenNotifications by timestamp if needed upon rollback
          state.unseenNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        }
      }
    },
    setUnseenCountOnly: (state, action: PayloadAction<number>) => {
      state.unseenCount = action.payload;
    },
    // If a notification is deleted from unseen, but API call fails, we only need to adjust count if it wasn't re-added
    decrementUnseenCountInternal: (state) => {
        state.unseenCount = Math.max(0, state.unseenCount - 1);
    },
    addNewUnseenNotification: (state, action: PayloadAction<ApiNotification>) => {
      const newNotification = action.payload;
      // Check if the notification already exists in unseen or seen to prevent duplicates
      const existsInUnseen = state.unseenNotifications.some(n => n._id === newNotification._id);
      const existsInSeen = state.seenNotifications.some(n => n._id === newNotification._id);

      if (!existsInUnseen && !existsInSeen) {
        // Add to the beginning of unseen notifications for newest first UX
        state.unseenNotifications.unshift(newNotification);
        state.unseenCount += 1;
      } else if (existsInSeen && !newNotification.seen) {
        // Edge case: if a notification marked as seen somehow comes as new & unseen again
        // Move it from seen to unseen
        state.seenNotifications = state.seenNotifications.filter(n => n._id !== newNotification._id);
        state.unseenNotifications.unshift(newNotification);
        state.unseenCount += 1;
      } else if (existsInUnseen && newNotification.seen) {
        // Edge case: if a notification already in unseen is updated to be seen via socket (less likely for 'newNotification' event)
        state.unseenNotifications = state.unseenNotifications.filter(n => n._id !== newNotification._id);
        state.seenNotifications.unshift(newNotification); // It's now seen, so no unseenCount change
      }
      // If it existsInUnseen and is still unseen, or existsInSeen and is still seen, do nothing.
    },
  },
});

export const {
  setInitialNotifications,
  setMoreNotifications,
  markAsSeenInStore,
  deleteNotificationFromStore,
  clearAllStoredNotifications,
  revertNotificationDeletion,
  setUnseenCountOnly,
  decrementUnseenCountInternal,
  addNewUnseenNotification,
} = notificationsSlice.actions;

export default notificationsSlice.reducer; 