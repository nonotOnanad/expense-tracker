/* ===================== Auth state ===================== */
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  setupResetPasswordModal();
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
  document.getElementById("change-password-btn").addEventListener("click", () => openResetModal(false));

  supabaseClient.auth.onAuthStateChange((_event, session) => {
    currentUser = session ? session.user : null;

    // Password recovery link lands on index.html with #recovery hash
    if (_event === "PASSWORD_RECOVERY") {
      hidePage();
      openResetModal(true);
      return;
    }

    if (currentUser) {
      showApp();
    } else {
      // Not logged in — redirect to login page
      window.location.replace("/");
    }
  });
});

/* ===================== Show / hide app ===================== */
function showApp() {
  document.getElementById("page-loading").style.display = "none";
  const root = document.getElementById("app-root");
  root.style.display = "";

  const emailEl = document.getElementById("user-email");
  if (emailEl) emailEl.textContent = currentUser.email;

  renderAll();
}

function hidePage() {
  document.getElementById("page-loading").style.display = "none";
  document.getElementById("app-root").style.display = "none";
}

/* ===================== Logout ===================== */
async function handleLogout() {
  await supabaseClient.auth.signOut();
  window.location.replace("/");
}

/* ===================== Reset / Change Password Modal ===================== */
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
    submitBtn.textContent = "Updating…";

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
