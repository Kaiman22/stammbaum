/* ═══════════════════════════════════════════════════════════
   STAMMBAUM – Authentication (Supabase Auth)
   ═══════════════════════════════════════════════════════════ */

const Auth = (() => {
  let supabase = null;
  let currentUser = null;
  let currentMember = null;
  let onAuthChangeCallback = null;
  let onPasswordRecoveryCallback = null;

  function init(supabaseClient) {
    supabase = supabaseClient;

    // Listen for auth state changes (login, logout, token refresh)
    // IMPORTANT: Don't make DB calls inside this callback — Supabase
    // aborts in-flight requests during auth state transitions.
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] onAuthStateChange:', event);
      if (event === 'SIGNED_OUT') {
        currentUser = null;
        currentMember = null;
        if (onAuthChangeCallback) onAuthChangeCallback(null, null);
      } else if (event === 'PASSWORD_RECOVERY') {
        // User clicked the password reset link in their email
        currentUser = session?.user || null;
        if (onPasswordRecoveryCallback) onPasswordRecoveryCallback();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        currentUser = session?.user || null;
        // Defer the DB lookup to avoid AbortError during auth transitions
        setTimeout(() => resolveAndNotify(), 500);
      }
    });

    // Defer initial session check to next tick so the caller
    // has time to register the onAuthChange callback first
    setTimeout(() => checkSession(), 0);
  }

  async function checkSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('[Auth] getSession:', session?.user?.id || 'no session');
      if (session?.user) {
        currentUser = session.user;
        await resolveAndNotify();
      } else {
        currentUser = null;
        currentMember = null;
        if (onAuthChangeCallback) onAuthChangeCallback(null, null);
      }
    } catch (err) {
      console.error('[Auth] getSession error:', err);
      if (onAuthChangeCallback) onAuthChangeCallback(null, null);
    }
  }

  async function resolveAndNotify() {
    if (!currentUser) {
      if (onAuthChangeCallback) onAuthChangeCallback(null, null);
      return;
    }
    try {
      currentMember = await DB.findMemberByUid(currentUser.id);
      console.log('[Auth] member resolved:', currentMember?.id || 'none');
    } catch (err) {
      console.error('[Auth] findMemberByUid failed:', err);
      currentMember = null;
    }
    if (onAuthChangeCallback) onAuthChangeCallback(currentUser, currentMember);
  }

  function onAuthChange(callback) {
    onAuthChangeCallback = callback;
  }

  function onPasswordRecovery(callback) {
    onPasswordRecoveryCallback = callback;
  }

  function getUser() {
    return currentUser;
  }

  function getMember() {
    return currentMember;
  }

  function setMember(member) {
    currentMember = member;
  }

  async function loginWithEmail(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { success: false, error: mapAuthError(error.message) };
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function registerWithEmail(email, password, displayName) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
        },
      });
      if (error) return { success: false, error: mapAuthError(error.message) };
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
      });
      if (error) return { success: false, error: mapAuthError(error.message) };
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function updatePassword(newPassword) {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: mapAuthError(error.message) };
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    currentMember = null;
  }

  function mapAuthError(message) {
    const msg = message.toLowerCase();
    if (msg.includes('invalid login')) return 'E-Mail oder Passwort falsch.';
    if (msg.includes('already registered')) return 'Diese E-Mail ist bereits registriert.';
    if (msg.includes('password')) return 'Passwort zu schwach (mind. 6 Zeichen).';
    if (msg.includes('invalid email')) return 'Ungültige E-Mail-Adresse.';
    if (msg.includes('rate limit')) return 'Zu viele Versuche. Bitte warte einen Moment.';
    if (msg.includes('network')) return 'Netzwerkfehler. Bitte prüfe deine Verbindung.';
    if (msg.includes('email not confirmed')) return 'Bitte bestätige zuerst deine E-Mail-Adresse.';
    return message;
  }

  return {
    init,
    onAuthChange,
    getUser,
    getMember,
    setMember,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
    updatePassword,
    onPasswordRecovery,
    logout,
  };
})();
