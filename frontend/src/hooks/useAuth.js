import { useSelector, useDispatch } from 'react-redux';
import { useCallback } from 'react';
import {
  loginUser,
  signupUser,
  logoutUser,
  checkAuthStatus,
  updateCurrentUserStatus
} from '../store/actions/thunks';

export const useAuth = () => {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);

  const login = useCallback((username, password) => {
    return dispatch(loginUser(username, password));
  }, [dispatch]);

  const signup = useCallback((userData) => {
    return dispatch(signupUser(userData));
  }, [dispatch]);

  const logout = useCallback(() => {
    return dispatch(logoutUser());
  }, [dispatch]);

  const checkAuth = useCallback(() => {
    return dispatch(checkAuthStatus());
  }, [dispatch]);

  const updateStatus = useCallback((status) => {
    return dispatch(updateCurrentUserStatus(status));
  }, [dispatch]);

  const refreshUser = useCallback(async () => {
    return dispatch(checkAuthStatus());
  }, [dispatch]);

  return {
    currentUser: auth.currentUser,
    refreshUser,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    signupSuccess: auth.signupSuccess,
    login,
    signup,
    logout,
    checkAuth,
    updateStatus
  };
};

export default useAuth;