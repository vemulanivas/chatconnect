import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  showNotification,
  dismissNotification
} from '../store/actions/thunks';
import {
  clearAllNotifications,
  markNotificationRead
} from '../store/actions/actionCreators';

export const useNotifications = () => {
  const dispatch = useDispatch();
  const notifications = useSelector((state) => state.notifications);

  const show = useCallback((notification) => {
    return dispatch(showNotification(notification));
  }, [dispatch]);

  const dismiss = useCallback((notificationId) => {
    return dispatch(dismissNotification(notificationId));
  }, [dispatch]);

  const clearAll = useCallback(() => {
    dispatch(clearAllNotifications());
  }, [dispatch]);

  const markAsRead = useCallback((notificationId) => {
    dispatch(markNotificationRead(notificationId));
  }, [dispatch]);

  const getUnreadNotifications = useCallback(() => {
    return notifications.notifications.filter(n => !n.read);
  }, [notifications.notifications]);

  const getNotificationsByType = useCallback((type) => {
    return notifications.notifications.filter(n => n.type === type);
  }, [notifications.notifications]);

  const showSuccess = useCallback((message, title = 'Success') => {
    return dispatch(showNotification({
      type: 'success',
      title,
      content: message
    }));
  }, [dispatch]);

  const showError = useCallback((message, title = 'Error') => {
    return dispatch(showNotification({
      type: 'error',
      title,
      content: message
    }));
  }, [dispatch]);

  const showInfo = useCallback((message, title = 'Info') => {
    return dispatch(showNotification({
      type: 'info',
      title,
      content: message
    }));
  }, [dispatch]);

  const showWarning = useCallback((message, title = 'Warning') => {
    return dispatch(showNotification({
      type: 'warning',
      title,
      content: message
    }));
  }, [dispatch]);

  return {
    notifications: notifications.notifications,
    unreadCount: notifications.unreadCount,
    show,
    dismiss,
    clearAll,
    markAsRead,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    getUnreadNotifications,
    getNotificationsByType
  };
};

export default useNotifications;
