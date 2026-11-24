export default function Logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
  return null;
}
