import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { Loader } from './Loader';

export const AdminRoute = ({ children }) => {
    const { user, isAdmin, loading } = useAppContext();

    if (loading) {
        return <Loader />;
    }

    if (!user || !isAdmin) {
        return <Navigate to="/" replace />;
    }

    return children;
};