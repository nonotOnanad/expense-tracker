/* ===================== Auth state ===================== */
let currentUser = null;
let authMode = "login";

document.addEventListener("DOMContentLoaded", () => {
  setupAuthTabs();
  setupAuthForm();
  document.getElementById("logout-btn").addEventListener("click", handleLogout);

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;
    if (currentUser) {
      showApp();
    } else {
      showAuthScreen();
    }
  });
});

/* ===================== Tabs (Log In / Sign Up) ===================== */
function setupAuthTabs() {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      authMode = tab.dataset.auth;
      document.querySelectorAll(".auth-tab").forEach((t) => t.classList.toggle("active", t === tab));
      document.getElementById("auth-submit").textContent = authMode === "login" ? "Log In" : "Create Account";
      hideAuthMessages();
    });
  });

  document.getElementById("auth-forgot").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = document.getElementById("auth-email").value.trim();
    if (!email) {
      showAuthError("Enter your email above, then click 'Forgot password?' again.");
      return;
    }
    hideAuthMessages();
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
    if (error) showAuthError(error.message);
    else showAuthNote("Password reset email sent. Check your inbox.");
  });
}

/* ===================== Login / Signup form ===================== */
function setupAuthForm() {
  document.getElementById("auth-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("auth-email").value.trim();
    const password = document.getElementById("auth-password").value;
    const submitBtn = document.getElementById("auth-submit");

    hideAuthMessages();
    submitBtn.disabled = true;
    submitBtn.textContent = "Please wait...";

    try {
      if (authMode === "login") {
        const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user && !data.session) {
          showAuthNote("Account created! Check your email to confirm, then log in.");
        }
      }
    } catch (err) {
      showAuthError(err.message || "Something went wrong. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = authMode === "login" ? "Log In" : "Create Account";
    }
  });
}

function showAuthError(msg) {
  const el = document.getElementById("auth-error");
  el.textContent = msg;
  el.hidden = false;
}

function showAuthNote(msg) {
  const el = document.getElementById("auth-note");
  el.textContent = msg;
  el.hidden = false;
}

function hideAuthMessages() {
  document.getElementById("auth-error").hidden = true;
  document.getElementById("auth-note").hidden = true;
}

/* ===================== Logout ===================== */
async function handleLogout() {
  await supabaseClient.auth.signOut();
}

/* ===================== Screen toggling ===================== */
function showApp() {
  document.getElementById("auth-screen").hidden = true;
  document.getElementById("app-root").hidden = false;

  const emailEl = document.getElementById("user-email");
  if (emailEl) emailEl.textContent = currentUser.email;

  renderAll();
}

function showAuthScreen() {
  document.getElementById("app-root").hidden = true;
  document.getElementById("auth-screen").hidden = false;
  document.getElementById("auth-form").reset();
  hideAuthMessages();
}
