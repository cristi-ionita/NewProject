import { Navigate } from "react-router-dom";

type AdminRouteProps = {
  children: JSX.Element;
};

function AdminRoute({ children }: AdminRouteProps) {
  const adminToken = localStorage.getItem("adminToken");
  const authUserCode = localStorage.getItem("authUserCode");

  if (authUserCode && !adminToken) {
    return <Navigate to="/user" replace />;
  }

  if (!adminToken) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default AdminRoute;