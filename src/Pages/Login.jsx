/* =========================================================
   PROJENIUS ADMIN — LOGIN PAGE
========================================================= */

import LoginBrand from "../Components/Login/LoginBrand/LoginBrand";
import LoginForm from "../Components/Login/LoginForm/LoginForm";
import { useEffect } from "react";

export default function Login({ onLogin }) {
  useEffect(() => {
    document.title = "Login | ProJenius";
  }, []);

  return (
    <main className="pa-login-screen">
      <LoginBrand />
      <LoginForm onLogin={onLogin} />
    </main>
  );
}
