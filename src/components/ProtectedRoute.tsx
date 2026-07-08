import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/use-auth"; // Assuming you have this or need to create it

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a proper spinner
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <Outlet />;
}
