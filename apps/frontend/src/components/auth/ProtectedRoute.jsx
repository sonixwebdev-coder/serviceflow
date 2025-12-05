import { Navigate } from 'react-router-dom';
import useAuth from '../../context/useAuth';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { loading, isAuthenticated, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-viperx-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !hasRole(...allowedRoles)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-300 mb-4">403</h1>
          <p className="text-xl text-gray-600 mb-4">Access Denied</p>
          <p className="text-gray-500">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
