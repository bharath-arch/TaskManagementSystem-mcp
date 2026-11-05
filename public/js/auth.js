// Auth Management Module
const auth = {
  currentUser: null,

  async init() {
    const token = API.getToken();
    if (!token) {
      this.showAuthScreen();
      return false;
    }

    try {
      const res = await API.getMe();
      this.currentUser = res.user;
      this.updateUserUI();
      this.hideAuthScreen();
      return true;
    } catch (err) {
      this.showAuthScreen();
      return false;
    }
  },

  showAuthScreen() {
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('app').style.display = 'none';
  },

  hideAuthScreen() {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
  },

  switchTab(tab) {
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');

    if (tab === 'login') {
      loginTab.classList.add('active');
      registerTab.classList.remove('active');
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
    } else {
      registerTab.classList.add('active');
      loginTab.classList.remove('active');
      registerForm.style.display = 'block';
      loginForm.style.display = 'none';
    }
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await API.login(email, password);
      API.setToken(res.token);
      this.currentUser = res.user;
      this.updateUserUI();
      this.hideAuthScreen();
      app.showToast('Logged in successfully!', 'success');
      app.init();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
      const res = await API.register(name, email, password);
      API.setToken(res.token);
      this.currentUser = res.user;
      this.updateUserUI();
      this.hideAuthScreen();
      app.showToast('Account created successfully!', 'success');
      app.init();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  async quickDemoLogin(email, password) {
    try {
      const res = await API.login(email, password);
      API.setToken(res.token);
      this.currentUser = res.user;
      this.updateUserUI();
      this.hideAuthScreen();
      app.showToast(`Welcome back, ${res.user.name.split(' ')[0]}!`, 'success');
      app.init();
    } catch (err) {
      app.showToast(err.message, 'error');
    }
  },

  updateUserUI() {
    if (!this.currentUser) return;
    const nameEl = document.getElementById('user-display-name');
    const avatarEl = document.getElementById('user-avatar');
    const commentAvatar = document.getElementById('comment-current-avatar');

    if (nameEl) nameEl.textContent = this.currentUser.name;
    if (avatarEl) avatarEl.src = this.currentUser.avatar;
    if (commentAvatar) commentAvatar.src = this.currentUser.avatar;
  },

  handleLogoutPrompt() {
    if (confirm(`Logged in as ${this.currentUser?.name} (${this.currentUser?.email}). Do you want to log out?`)) {
      API.setToken(null);
      this.currentUser = null;
      this.showAuthScreen();
      app.showToast('Logged out', 'success');
    }
  }
};

window.auth = auth;

