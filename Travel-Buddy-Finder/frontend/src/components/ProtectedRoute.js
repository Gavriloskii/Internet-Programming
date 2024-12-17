import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectIsAuthenticated } from '../redux/userSlice';

const ProtectedRoute = ({ children }) => {
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const location = useLocation();
    const token = localStorage.getItem('token');

    // If there's no token or user is not authenticated, redirect to login
    if (!token || !isAuthenticated) {
        // Save the attempted URL for redirecting after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If user is authenticated, render the protected component
    return children;
};

export default ProtectedRoute;
