import { Link } from "react-router-dom";

export default function Navbar() {

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  }

  return (
    <header className="navbar">
      <nav className="nav-inner">
        <div className="nav-links">
          <Link to="/login">Login</Link>
          <Link to="/profile">Profile</Link>
          <Link to="/admin">Admin</Link>
          <Link to="/reset">Reset</Link>
          <Link to="/register-user">Register User</Link>
          <Link to="/users">Users</Link>
        </div>

        <button className="logout" onClick={logout}>
          Logout
        </button>
      </nav>
    </header>
  );
}
