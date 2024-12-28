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
    markAsRead: (state, action) => {
      const { id } = action.payload;
      const notification = state.matchNotifications.find(notification => notification.id === id);
      if (notification) {
        notification.read = true;
      }
    },
    markAllAsRead: (state) => {
      state.matchNotifications.forEach(notification => {
        notification.read = true;
      });
    },
    clearAllNotifications: (state) => {  
      state.matchNotifications = [];
    },
    addNotification: (state, action) => {
      state.matchNotifications.push(action.payload);
    }
  }
});

export const {
  showMatchNotification,
  removeMatchNotification,
  clearAllNotifications,
  markAsRead,
  markAllAsRead,
  addNotification
} = notificationsSlice.actions;

export const selectNotifications = (state) => state.notifications.matchNotifications;

export const selectHasUnread = (state) => 
  state.notifications.matchNotifications.some(notification => !notification.read);

export default notificationsSlice.reducer;
