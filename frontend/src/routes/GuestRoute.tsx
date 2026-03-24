import { Navigate } from "react-router-dom";

type GuestRouteProps = {
  children: JSX.Element;
};

function GuestRoute({ children }: GuestRouteProps) {
  const adminToken = localStorage.getItem("adminToken");
  const authUserCode = localStorage.getItem("authUserCode");

  if (adminToken) {
    return <Navigate to="/admin" replace />;
  }

  if (authUserCode) {
    return <Navigate to="/user" replace />;
  }

  return children;
}

export default GuestRoute;