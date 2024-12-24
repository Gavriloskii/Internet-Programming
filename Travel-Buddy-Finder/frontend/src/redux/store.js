import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import notificationsReducer from './notificationsSlice';
import chatReducer from './chatSlice';

const store = configureStore({
  reducer: {
    user: userReducer,
    notifications: notificationsReducer,
    chat: chatReducer,
  },
});

export default store;
