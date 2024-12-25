import { createSlice } from '@reduxjs/toolkit';

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    matchNotifications: [],
  },
  reducers: {
    showMatchNotification: (state, action) => {
      state.matchNotifications.push(action.payload);
    },
    removeMatchNotification: (state, action) => {
      state.matchNotifications = state.matchNotifications.filter(
        notification => notification.matchId !== action.payload
      );
    },
    clearAllNotifications: (state) => {
      state.matchNotifications = [];
    }
  }
});

export const {
  showMatchNotification,
  removeMatchNotification,
  clearAllNotifications
} = notificationsSlice.actions;

export const selectMatchNotifications = (state) => state.notifications.matchNotifications;

export default notificationsSlice.reducer;
