import { supabase } from "./supabase-client.js";

const MODES = Object.freeze({
  login: {
    title: "Inicia sesión",
    description: "Entra en Eldoria con tu cuenta.",
    submit: "Entrar",
  },
  signup: {
    title: "Crear cuenta",
    description: "Usa un correo válido para verificar tu cuenta.",
    submit: "Crear cuenta",
  },
  reset: {
    title: "Recuperar contraseña",
    description: "Te enviaremos un enlace para elegir una contraseña nueva.",
    submit: "Enviar enlace",
  },
  updatePassword: {
    title: "Elige una contraseña nueva",
    description: "Tu enlace de recuperación se ha verificado.",
    submit: "Guardar contraseña",
  },
});

function explainAuthError(error) {
  const message = error?.message ?? "";
  if (/invalid login credentials/i.test(message)) return "El correo o la contraseña no son correctos.";
  if (/email not confirmed/i.test(message)) return "Confirma tu correo desde el enlace que te enviamos.";
  if (/user already registered/i.test(message)) return "Ya existe una cuenta con ese correo.";
  if (/password/i.test(message) && /least|short|characters/i.test(message)) {
    return "La contraseña no cumple los requisitos mínimos.";
  }
  if (/rate limit|too many requests/i.test(message)) return "Has hecho demasiados intentos. Espera un momento y prueba de nuevo.";
  return "No se pudo completar la solicitud. Comprueba los datos e inténtalo de nuevo.";
}

export class AuthMenu {
  constructor(ui, { onStartGame, onExitGame }) {
    this.ui = ui;
    this.onStartGame = onStartGame;
    this.onExitGame = onExitGame;
    this.mode = "login";
    this.session = null;
    this.demoMode = false;
    this.subscription = null;
    this.authEventReceived = false;

    this.onSubmit = (event) => {
      event.preventDefault();
      this.submit();
    };
    this.onSwitchMode = () => {
      this.setMode(this.mode === "login" ? "signup" : "login");
      this.setMessage("");
    };
    this.onResetPassword = () => {
      this.setMode("reset");
      this.setMessage("");
    };
    this.onPlayDemo = () => {
      this.demoMode = true;
      this.showMenu(null);
    };
    this.onPlay = () => {
      this.ui.authScreen.hidden = true;
      this.ui.mainMenu.hidden = true;
      this.ui.gameShell.hidden = false;
      this.onStartGame(this.session?.user?.id ?? null);
    };
    this.onSignOut = () => this.signOut();
    this.onReturnToMenu = () => {
      this.onExitGame();
      this.showMenu(this.session);
    };
  }

  async initialize() {
    this.ui.authForm.addEventListener("submit", this.onSubmit);
    this.ui.authModeToggle.addEventListener("click", this.onSwitchMode);
    this.ui.authResetToggle.addEventListener("click", this.onResetPassword);
    this.ui.authDemoButton.addEventListener("click", this.onPlayDemo);
    this.ui.menuPlay.addEventListener("click", this.onPlay);
    this.ui.menuSignOut.addEventListener("click", this.onSignOut);
    this.ui.backToMenu.addEventListener("click", this.onReturnToMenu);

    this.setMode("login");
    if (!supabase) {
      this.ui.authConfigWarning.hidden = false;
      this.ui.authSubmit.disabled = true;
      this.ui.authModeToggle.hidden = true;
      this.ui.authResetToggle.hidden = true;
      this.setMessage("Configura Supabase para activar el acceso por correo.");
      this.showAuth();
      return;
    }

    this.ui.authConfigWarning.hidden = true;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      this.authEventReceived = true;
      if (event === "PASSWORD_RECOVERY") {
        this.showPasswordRecovery(session);
        return;
      }
      this.showSession(session);
    });
    this.subscription = listener.subscription;

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!this.authEventReceived) this.showSession(data?.session ?? null);
    } catch {
      if (!this.authEventReceived) this.showAuth();
      this.setMessage("No se pudo comprobar la sesión. Puedes intentarlo de nuevo.", true);
    }
  }

  setMode(mode) {
    this.mode = mode;
    const details = MODES[mode];
    this.ui.authTitle.textContent = details.title;
    this.ui.authDescription.textContent = details.description;
    this.ui.authSubmit.textContent = details.submit;
    this.ui.authEmailField.hidden = mode === "updatePassword";
    this.ui.authPasswordField.hidden = mode === "reset";
    this.ui.authEmail.required = mode !== "updatePassword";
    this.ui.authPassword.required = mode !== "reset";
    this.ui.authPassword.autocomplete = mode === "signup" || mode === "updatePassword"
      ? "new-password"
      : "current-password";
    this.ui.authPasswordLabel.textContent = mode === "updatePassword" ? "Contraseña nueva" : "Contraseña";
    this.ui.authModeToggle.hidden = mode === "updatePassword" || !supabase;
    this.ui.authModeToggle.textContent = mode === "login" ? "Crear cuenta" : "Volver a iniciar sesión";
    this.ui.authResetToggle.hidden = mode !== "login" || !supabase;
    this.ui.authPassword.value = "";
  }

  setMessage(message, isError = false) {
    this.ui.authMessage.textContent = message;
    this.ui.authMessage.classList.toggle("is-error", isError);
  }

  setSubmitting(isSubmitting) {
    this.ui.authSubmit.disabled = isSubmitting || !supabase;
    this.ui.authModeToggle.disabled = isSubmitting;
    this.ui.authResetToggle.disabled = isSubmitting;
    this.ui.authDemoButton.disabled = isSubmitting;
  }

  async submit() {
    if (!supabase) return;

    const email = this.ui.authEmail.value.trim().toLowerCase();
    const password = this.ui.authPassword.value;
    this.setMessage("");
    this.setSubmitting(true);

    try {
      if (this.mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          this.showSession(data.session);
        } else {
          this.setMode("login");
          this.setMessage("Cuenta creada. Revisa tu correo y confirma la dirección para entrar.");
        }
      } else if (this.mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        this.setMessage("Si la cuenta existe, recibirás un enlace para cambiar la contraseña.");
      } else if (this.mode === "updatePassword") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        await supabase.auth.signOut();
        this.setMode("login");
        this.setMessage("Contraseña actualizada. Ya puedes iniciar sesión.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        this.showSession(data.session);
      }
    } catch (error) {
      this.setMessage(explainAuthError(error), true);
    } finally {
      this.setSubmitting(false);
    }
  }

  showSession(session) {
    if (!session?.user) {
      this.session = null;
      if (this.demoMode) this.showMenu(null);
      else this.showAuth();
      return;
    }

    this.session = session;
    this.demoMode = false;
    this.ui.authScreen.hidden = true;
    this.ui.mainMenu.hidden = false;
    this.ui.gameShell.hidden = true;
    this.ui.menuStatus.textContent = "SESIÓN CONECTADA";
    this.ui.menuUser.textContent = session.user.email ?? "Cuenta conectada";
    this.ui.menuSignOut.textContent = "Cerrar sesión";
  }

  showMenu(session = this.session) {
    if (session?.user) {
      this.showSession(session);
      return;
    }

    this.session = null;
    this.ui.authScreen.hidden = true;
    this.ui.mainMenu.hidden = false;
    this.ui.gameShell.hidden = true;
    this.ui.menuStatus.textContent = this.demoMode ? "MODO LOCAL" : "SIN SESIÓN";
    this.ui.menuUser.textContent = this.demoMode
      ? "Estás jugando en modo local; no se ha iniciado sesión."
      : "Inicia sesión para continuar.";
    this.ui.menuSignOut.textContent = this.demoMode ? "Volver al acceso" : "Iniciar sesión";
  }

  showAuth() {
    this.demoMode = false;
    this.session = null;
    this.onExitGame();
    this.ui.gameShell.hidden = true;
    this.ui.mainMenu.hidden = true;
    this.ui.authScreen.hidden = false;
    if (supabase) this.setMode("login");
  }

  showPasswordRecovery(session) {
    this.session = session;
    this.demoMode = false;
    this.onExitGame();
    this.ui.gameShell.hidden = true;
    this.ui.mainMenu.hidden = true;
    this.ui.authScreen.hidden = false;
    this.setMode("updatePassword");
    this.setMessage("Escribe la contraseña nueva para tu cuenta.");
  }

  async signOut() {
    if (!this.session || !supabase) {
      this.showAuth();
      return;
    }

    this.ui.menuSignOut.disabled = true;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      this.showAuth();
    } catch {
      this.ui.menuUser.textContent = "No se pudo cerrar sesión. Inténtalo de nuevo.";
    } finally {
      this.ui.menuSignOut.disabled = false;
    }
  }

  destroy() {
    this.subscription?.unsubscribe();
    this.ui.authForm.removeEventListener("submit", this.onSubmit);
    this.ui.authModeToggle.removeEventListener("click", this.onSwitchMode);
    this.ui.authResetToggle.removeEventListener("click", this.onResetPassword);
    this.ui.authDemoButton.removeEventListener("click", this.onPlayDemo);
    this.ui.menuPlay.removeEventListener("click", this.onPlay);
    this.ui.menuSignOut.removeEventListener("click", this.onSignOut);
    this.ui.backToMenu.removeEventListener("click", this.onReturnToMenu);
    this.onExitGame();
  }
}
