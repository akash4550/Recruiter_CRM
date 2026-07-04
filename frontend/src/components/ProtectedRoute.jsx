import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();

  // 1. Defensive lifecycle handling: Wait for AuthContext to verify the session
  if (loading) {
    // Alternatively, return a <Spinner /> component here
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Verifying session...</p>
      </div>
    );
  }

  // 2. Unauthenticated: Redirect to login and preserve the intended destination
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Unauthorized: Show a static error view, keeping the user in control
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 max-w-md w-full">
          <div className="text-red-500 text-5xl mb-4">
            <span role="img" aria-label="Access Denied">🛡️</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-6">
            Your current role (<span className="font-semibold text-slate-800">{user.role}</span>) 
            does not have permission to view this section.
          </p>
          <Link 
            to="/" 
            className="inline-block bg-blue-600 text-white font-medium px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 4. Authorized: Render the requested route
  return children;
};

export default ProtectedRoute;