import { redirect } from "next/navigation";

const LOGIN_ROUTE = "/login";

export default function AdminLoginRedirectPage() {
  redirect(LOGIN_ROUTE);
}