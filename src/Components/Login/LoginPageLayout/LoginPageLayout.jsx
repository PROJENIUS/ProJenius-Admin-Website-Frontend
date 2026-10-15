
/* =========================================================
   PROJENIUS ADMIN — LOGIN PAGE LAYOUT
========================================================= */

export default function LoginPageLayout({ brand, form }) {
  return (
    <main className="pa-login-layout">
      {/* SECTION 01: BRAND PANEL */}
      <div className="pa-login-layout__brand-panel">
        {brand}
      </div>

      {/* SECTION 02: LOGIN FORM PANEL */}
      <div className="pa-login-layout__form-panel">
        {form}
      </div>
    </main>
  );
}
