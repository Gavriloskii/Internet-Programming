import { configureStore } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import chatReducer from './chatSlice';
import matchesReducer from './matchesSlice';
import notificationsReducer from './notificationsSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    chat: chatReducer,
    matches: matchesReducer,
    notifications: notificationsReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: ['socket/connected', 'socket/disconnected', 'socket/message'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.socket'],
        // Ignore these paths in the state
        ignoredPaths: ['socket.connection'],
      },
    }),
});

// Setup socket listeners after store is created
export const setupSocketListeners = (socket) => {
  return (dispatch) => {
    socket.on('connect', () => {
      dispatch({ type: 'socket/connected' });
    });

    socket.on('disconnect', () => {
      dispatch({ type: 'socket/disconnected' });
    });

    socket.on('message', (message) => {
      dispatch({ type: 'socket/message', payload: message });
    });
  };
};

export default store;
