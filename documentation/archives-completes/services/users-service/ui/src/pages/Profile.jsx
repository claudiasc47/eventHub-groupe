import { isAxiosError } from "axios";
import { useEffect, useState } from "react";
import api from "../api";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const { data } = await api.get("/users/me", {
          signal: controller.signal,
        });

        if (!controller.signal.aborted) setProfile(data);
      } catch (error) {
        if (controller.signal.aborted) return;

        if (isAxiosError(error)) {
          if (error.response?.status === 401) {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            localStorage.removeItem("email");
            window.location.replace("/login");
            return;
          }

          if (error.request && !error.response) {
            setErrorMessage("Impossible de joindre l’API. Réessaie dans un instant.");
            return;
          }
        }

        setErrorMessage("Le profil n’a pas pu être chargé. Réessaie dans un instant.");
      }
    }

    loadProfile();
    return () => controller.abort();
  }, []);

  const missingValue = "Non renseigné";

  return (
    <div className="container">
      <div className="card">
        <h2>Profil</h2>
        {!profile && !errorMessage && <p role="status">Chargement du profil…</p>}
        {errorMessage && <p role="alert">{errorMessage}</p>}
        {profile && (
          <>
            <p><strong>Pseudo</strong> {profile.pseudo}</p>
            <p><strong>E-mail</strong> {profile.email}</p>
            <p><strong>Rôle</strong> {profile.role}</p>
            <p><strong>Prénom</strong> {profile.firstName ?? missingValue}</p>
            <p><strong>Nom</strong> {profile.lastName ?? missingValue}</p>
            <p><strong>Téléphone</strong> {profile.phone ?? missingValue}</p>
            <p><strong>Date de naissance</strong> {profile.birthDate ?? missingValue}</p>
          </>
        )}
      </div>
    </div>
  );
}
