import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, logout, updateUserProfile } from '../redux/slices/userSlice';

const TestRedux = () => {
  const dispatch = useDispatch();
  const userInfo = useSelector((state) => state.user.userInfo);

  useEffect(() => {
    // Dispatch login action
    dispatch(login({ name: 'John Doe', email: 'john@example.com' }));
    console.log('User logged in:', userInfo);

    // Update user profile
    dispatch(updateUserProfile({ email: 'john.doe@example.com' }));
    console.log('User profile updated:', userInfo);

    // Dispatch logout action
    dispatch(logout());
    console.log('User logged out:', userInfo);
  }, [dispatch, userInfo]);

  return <div>Check the console for Redux state changes!</div>;
};

export default TestRedux;
