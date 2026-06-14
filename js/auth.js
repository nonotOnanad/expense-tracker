/* ===================== Auth state ===================== */
let currentUser = null;
let authMode = "login";

document.addEventListener("DOMContentLoaded", () => {
  setupAuthTabs();
  setupAuthForm();
  setupResetPasswordModal();
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("change-password-btn").addEventListener("click", () => openResetModal(false));

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;

    // Supabase fires PASSWORD_RECOVERY when user arrives via reset email link
    if (_event === "PASSWORD_RECOVERY") {
      openResetModal(true);
      return;
    }

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
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) showAuthError(error.message);
    else showAuthNote("Password reset email sent! Check your inbox and click the link.");
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

/* ===================== Reset / Change Password Modal ===================== */
// isRecovery = true  → user arrived via email link (must update before entering app)
// isRecovery = false → logged-in user wants to change their password
function openResetModal(isRecovery) {
  const overlay = document.getElementById("reset-modal-overlay");
  const title   = document.getElementById("reset-modal-title");
  const form    = document.getElementById("reset-password-form");

  title.textContent = isRecovery ? "Set New Password" : "Change Password";
  form.reset();
  hideResetMessages();
  overlay.dataset.recovery = isRecovery ? "1" : "0";
  overlay.classList.add("open");
  setTimeout(() => document.getElementById("reset-new-password").focus(), 100);
}

function closeResetModal() {
  document.getElementById("reset-modal-overlay").classList.remove("open");
}

function showResetError(msg) {
  const el = document.getElementById("reset-error");
  el.textContent = msg;
  el.hidden = false;
}

function showResetNote(msg) {
  const el = document.getElementById("reset-note");
  el.textContent = msg;
  el.hidden = false;
}

function hideResetMessages() {
  document.getElementById("reset-error").hidden = true;
  document.getElementById("reset-note").hidden = true;
}

function setupResetPasswordModal() {
  const overlay = document.getElementById("reset-modal-overlay");

  document.getElementById("reset-modal-close").addEventListener("click", closeResetModal);
  overlay.addEventListener("click", (e) => {
    // Prevent closing if this is a recovery flow (user MUST set a password)
    if (e.target === overlay && overlay.dataset.recovery !== "1") closeResetModal();
  });

  document.getElementById("reset-password-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const newPassword     = document.getElementById("reset-new-password").value;
    const confirmPassword = document.getElementById("reset-confirm-password").value;
    const submitBtn       = document.getElementById("reset-submit");

    hideResetMessages();

    if (newPassword !== confirmPassword) {
      showResetError("Passwords don't match. Please try again.");
      return;
    }
    if (newPassword.length < 6) {
      showResetError("Password must be at least 6 characters.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Updating...";

    try {
      const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
      if (error) throw error;

      showResetNote("Password updated successfully!");
      setTimeout(() => {
        closeResetModal();
        if (typeof showToast === "function") showToast("Password updated ✓");
      }, 1200);
    } catch (err) {
      showResetError(err.message || "Failed to update password. Please try again.");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Update Password";
    }
  });
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
