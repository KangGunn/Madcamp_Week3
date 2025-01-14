import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // 로그인하지 않은 사용자는 로그인 페이지로 리다이렉트
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
