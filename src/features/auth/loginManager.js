/* ==========================================================================
   DRAGME FEATURE: LOGIN CONTROLLER (src/features/auth/loginManager.js)
   Login page form handler, password toggle & submission
   ========================================================================== */

import { authApi } from '../../api/authApi.js';
import { authManager } from './authManager.js';
import { toast } from '../toast/toastManager.js';
import { router } from '../../app/router.js';

export const LoginManager = {
  init() {
    this.loginPageView = document.getElementById('loginPageView');
    this.form = document.getElementById('loginPageForm');
    this.identifierInput = document.getElementById('loginPageIdentifierInput');
    this.passwordInput = document.getElementById('loginPagePasswordInput');
    this.submitBtn = document.getElementById('btnLoginSubmit');
    this.errorMsgArea = document.getElementById('loginPageErrorMsg');
    this.btnTogglePwd = document.getElementById('btnToggleLoginPwd');
    this.btnTopSignup = document.getElementById('loginTopSignupBtn');
    this.btnBottomSignup = document.getElementById('btnLoginBottomSignup');
    this.brandLogo = document.getElementById('loginBrandLogo');
    this.forgotLink = document.getElementById('loginPageForgotLink');

    if (!this.loginPageView) return;

    this.bindEvents();
  },

  bindEvents() {
    this.btnTogglePwd?.addEventListener('click', () => {
      if (!this.passwordInput) return;
      const isPwd = this.passwordInput.type === 'password';
      this.passwordInput.type = isPwd ? 'text' : 'password';
      this.btnTogglePwd.innerHTML = isPwd ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
    });

    this.btnTopSignup?.addEventListener('click', () => {
      router.navigate('signup');
    });

    this.btnBottomSignup?.addEventListener('click', () => {
      router.navigate('signup');
    });

    this.brandLogo?.addEventListener('click', (e) => {
      e.preventDefault();
      router.navigate('feed');
    });

    this.forgotLink?.addEventListener('click', (e) => {
      e.preventDefault();
      toast.info('Password reset link sent to your registered email.');
    });

    this.form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const loginVal = this.identifierInput?.value?.trim() || '';
      const pwdVal = this.passwordInput?.value || '';

      if (!loginVal || !pwdVal) {
        this.showError('Please enter your username/email and password.');
        return;
      }

      this.clearError();
      this.setLoading(true);

      try {
        const res = await authApi.login({ login: loginVal, password: pwdVal });
        authManager.setSession(res.token, res.user);
        toast.success(`Welcome back, @${res.user.username}!`);
        router.navigate('feed');
      } catch (err) {
        this.showError(err.message || 'Invalid username/email or password.');
      } finally {
        this.setLoading(false);
      }
    });
  },

  showError(msg) {
    if (this.errorMsgArea) {
      this.errorMsgArea.textContent = msg;
      this.errorMsgArea.style.display = 'block';
    }
  },

  clearError() {
    if (this.errorMsgArea) {
      this.errorMsgArea.style.display = 'none';
    }
  },

  setLoading(loading) {
    if (!this.submitBtn) return;
    const btnText = this.submitBtn.querySelector('.btn-text');
    const btnArrow = this.submitBtn.querySelector('.btn-arrow-icon');
    const btnSpinner = this.submitBtn.querySelector('.btn-spinner');

    if (loading) {
      if (btnText) btnText.textContent = 'Signing in...';
      if (btnArrow) btnArrow.style.display = 'none';
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
      this.submitBtn.disabled = true;
    } else {
      if (btnText) btnText.textContent = 'Sign In';
      if (btnArrow) btnArrow.style.display = 'inline-block';
      if (btnSpinner) btnSpinner.style.display = 'none';
      this.submitBtn.disabled = false;
    }
  }
};
