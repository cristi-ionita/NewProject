import { Navigate } from "react-router-dom";

type UserRouteProps = {
  children: JSX.Element;
};

function UserRoute({ children }: UserRouteProps) {
  const adminToken = localStorage.getItem("adminToken");
  const authUserCode = localStorage.getItem("authUserCode");

  if (adminToken) {
    return <Navigate to="/admin" replace />;
  }

  if (!authUserCode) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default UserRoute;