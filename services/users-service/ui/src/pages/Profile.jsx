import { useEffect, useState } from "react";
import api from "../api";

export default function Profile() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await api.get("/users/me", {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("token"),
          },
        });

        setProfile(res.data);
      } catch {
        window.location.href = "/login";
      }
    }

    loadProfile();
  }, []);

  if (!profile) return <p>Loading...</p>;

  return (
    <div className="container">
    <div className="card">
      <h2>Profile</h2>
      <p>
        <strong>Email :</strong> {profile.email}
      </p>
      <p>
        <strong>Role :</strong> {profile.role}
      </p>
    </div>
    </div>
  );
}
