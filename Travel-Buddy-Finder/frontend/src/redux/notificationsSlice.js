import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    notifications: [],
    unreadCount: 0
};

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        addNotification: (state, action) => {
            state.notifications.unshift({
                ...action.payload,
                unread: true,
                timestamp: new Date().toISOString()
            });
            state.unreadCount += 1;
        },
        markAsRead: (state, action) => {
            const notificationId = action.payload;
            const notification = state.notifications.find(n => n.id === notificationId);
            if (notification && notification.unread) {
                notification.unread = false;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        markAllAsRead: (state) => {
            state.notifications.forEach(notification => {
                notification.unread = false;
            });
            state.unreadCount = 0;
        },
        clearNotifications: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
        }
    }
});

export const {
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications
} = notificationsSlice.actions;

export const selectNotifications = (state) => state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectHasUnread = (state) => state.notifications.unreadCount > 0;

export default notificationsSlice.reducer;
