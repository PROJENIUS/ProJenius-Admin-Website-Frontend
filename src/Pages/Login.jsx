/* =========================================================
   PROJENIUS ADMIN — LOGIN PAGE
========================================================= */

import LoginBrand from "../Components/Login/LoginBrand/LoginBrand";
import LoginForm from "../Components/Login/LoginForm/LoginForm";

export default function Login({ onLogin }) {
  return (
    <main className="pa-login-screen">
      <LoginBrand />
      <LoginForm onLogin={onLogin} />
    </main>
  );
}