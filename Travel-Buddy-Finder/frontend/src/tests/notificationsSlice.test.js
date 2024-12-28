import { createStore } from 'redux';
import notificationsReducer, { markAsRead, markAllAsRead, selectNotifications, addNotification } from '../redux/notificationsSlice';

describe('notificationsSlice', () => {
  let store;

  beforeEach(() => {
    store = createStore(notificationsReducer);
  });

  describe('markAsRead action', () => {
    it('should mark a notification as read', () => {
      const initialState = {
        matchNotifications: [
          { id: 1, message: 'Match 1', read: false },
          { id: 2, message: 'Match 2', read: false },
        ],
      };
      store.dispatch({ type: 'notifications/clearAllNotifications' });
      store.dispatch({ type: 'notifications/showMatchNotification', payload: initialState.matchNotifications[0] });
      store.dispatch({ type: 'notifications/showMatchNotification', payload: initialState.matchNotifications[1] });

      store.dispatch(markAsRead({ id: 1 }));

      const state = store.getState();
      expect(state.matchNotifications[0].read).toBe(true);
      expect(state.matchNotifications[1].read).toBe(false);
    });

    it('should not change state for non-matching notification', () => {
      const initialState = {
        matchNotifications: [
          { id: 1, message: 'Match 1', read: false },
          { id: 2, message: 'Match 2', read: false },
        ],
      };
      store.dispatch({ type: 'notifications/clearAllNotifications' });
      store.dispatch({ type: 'notifications/showMatchNotification', payload: initialState.matchNotifications[0] });
      store.dispatch({ type: 'notifications/showMatchNotification', payload: initialState.matchNotifications[1] });

      store.dispatch(markAsRead({ id: 3 }));

      const state = store.getState();
      expect(state.matchNotifications[0].read).toBe(false);
      expect(state.matchNotifications[1].read).toBe(false);
    });
  });

  describe('addNotification action', () => {
    it('should add a notification to the state', () => {
      const notification = { id: 1, message: 'New Match Notification', read: false };
      store.dispatch(addNotification(notification));

      const state = store.getState();
      expect(state.matchNotifications).toContainEqual(notification);
    });

    it('should add multiple notifications to the state', () => {
      const notification1 = { id: 1, message: 'First Notification', read: false };
      const notification2 = { id: 2, message: 'Second Notification', read: false };

      store.dispatch(addNotification(notification1));
      store.dispatch(addNotification(notification2));

      const state = store.getState();
      expect(state.matchNotifications).toContainEqual(notification1);
      expect(state.matchNotifications).toContainEqual(notification2);
    });
  });

  describe('selectNotifications selector', () => {
    it('should return the notifications from the state', () => {
      const state = {
        notifications: {
          matchNotifications: [
            { matchId: 1, message: 'Match 1' },
            { matchId: 2, message: 'Match 2' },
          ],
        },
      };

      const result = selectNotifications(state);
      expect(result).toEqual(state.notifications.matchNotifications);
    });

    it('should return an empty array if there are no notifications', () => {
      const state = {
        notifications: {
          matchNotifications: [],
        },
      };

      const result = selectNotifications(state);
      expect(result).toEqual([]);
    });
  });
});
