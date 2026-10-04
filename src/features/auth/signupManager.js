/* ==========================================================================
   DRAGME FEATURE: SIGNUP CONTROLLER (src/features/auth/signupManager.js)
   Multi-step registration with real-time username availability feedback
   ========================================================================== */

import { authApi } from '../../api/authApi.js';
import { authManager } from './authManager.js';
import { toast } from '../toast/toastManager.js';
import { router } from '../../app/router.js';

export const UsernameService = {
  cache: new Map(),

  validateFormat(username) {
    if (!username || username.length === 0) {
      return { valid: false, status: 'idle', message: 'Enter a username' };
    }
    if (username.length < 4 || username.length > 20) {
      return { valid: false, status: 'invalid', message: 'Usernames must be 4–20 characters long.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { valid: false, status: 'invalid', message: 'Can only contain letters, numbers and underscores.' };
    }
    if (username.startsWith('_') || username.endsWith('_')) {
      return { valid: false, status: 'invalid', message: "Can't start or end with an underscore." };
    }
    return { valid: true, status: 'valid' };
  },

  async checkAvailability(username) {
    const formatCheck = this.validateFormat(username);
    if (!formatCheck.valid) {
      return formatCheck;
    }

    const lower = username.toLowerCase();
    if (this.cache.has(lower)) {
      return this.cache.get(lower);
    }

    try {
      const data = await authApi.checkUsername(username);
      const result = {
        valid: data.available,
        status: data.status,
        message: data.message || data.error || (data.available ? `${username} is available!` : `@${username} is already taken.`),
        username
      };
      this.cache.set(lower, result);
      return result;
    } catch (err) {
      const reserved = ['admin', 'moderator', 'dragme', 'root', 'api', 'system', 'support', 'anonymous'];
      const isTaken = reserved.includes(lower);
      const fallbackResult = {
        valid: !isTaken,
        status: isTaken ? 'taken' : 'available',
        message: isTaken ? `@${username} is already taken.` : `${username} is available!`,
        username
      };
      this.cache.set(lower, fallbackResult);
      return fallbackResult;
    }
  }
};

export const SignupManager = {
  state: {
    currentStep: 1,
    username: '',
    usernameStatus: 'idle',
    usernameError: '',
    isCheckingUsername: false,
    canContinue: false
  },
  debounceTimer: null,

  init() {
    this.signupPageView = document.getElementById('signupPageView');
    this.signupUsernameInput = document.getElementById('signupUsernameInput');
    this.usernameInputBox = document.getElementById('usernameInputBox');
    this.usernameStatusIndicator = document.getElementById('usernameStatusIndicator');
    this.usernameValidationMsg = document.getElementById('usernameValidationMsg');
    this.feedbackMessageText = document.getElementById('feedbackMessageText');
    this.btnSignupContinue = document.getElementById('btnSignupContinue');
    this.authTopLoginBtn = document.getElementById('authTopLoginBtn');
    this.btnSignupBottomLogin = document.getElementById('btnSignupBottomLogin');
    this.signupBrandLogo = document.getElementById('signupBrandLogo');

    this.ruleLength = document.getElementById('ruleLength');
    this.ruleChars = document.getElementById('ruleChars');
    this.ruleEdges = document.getElementById('ruleEdges');

    if (!this.signupPageView) return;

    this.bindEvents();
    this.bindStep2Events();

    if (this.signupUsernameInput) {
      const initialVal = this.signupUsernameInput.value.trim();
      if (initialVal) {
        this.handleUsernameChange(initialVal, true);
      }
    }
  },

  bindEvents() {
    this.signupUsernameInput?.addEventListener('input', (e) => {
      this.handleUsernameChange(e.target.value, false);
    });

    this.signupUsernameInput?.addEventListener('blur', (e) => {
      this.handleUsernameChange(e.target.value.trim(), true);
    });

    this.signupUsernameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.state.canContinue) {
        e.preventDefault();
        this.handleContinue();
      }
    });

    this.btnSignupContinue?.addEventListener('click', (e) => {
      e.preventDefault();
      if (this.state.canContinue) {
        this.handleContinue();
      }
    });

    this.authTopLoginBtn?.addEventListener('click', () => {
      router.navigate('login');
    });

    this.btnSignupBottomLogin?.addEventListener('click', () => {
      router.navigate('login');
    });

    this.signupBrandLogo?.addEventListener('click', (e) => {
      e.preventDefault();
      router.navigate('feed');
    });
  },

  updateRulesList(username) {
    const len = username ? username.length : 0;
    const isLenValid = len >= 4 && len <= 20;
    const isCharValid = /^[a-zA-Z0-9_]+$/.test(username);
    const isEdgeValid = username && !username.startsWith('_') && !username.endsWith('_');

    this.updateRuleItem(this.ruleLength, isLenValid);
    this.updateRuleItem(this.ruleChars, isCharValid);
    this.updateRuleItem(this.ruleEdges, isEdgeValid);
  },

  updateRuleItem(el, isValid) {
    if (!el) return;
    if (isValid) {
      el.classList.add('rule-valid');
      el.classList.remove('rule-invalid');
    } else {
      el.classList.remove('rule-valid');
      el.classList.add('rule-invalid');
    }
  },

  handleUsernameChange(val, immediate = false) {
    const cleanVal = val.trim();
    this.state.username = cleanVal;
    this.updateRulesList(cleanVal);

    if (this.debounceTimer) clearTimeout(this.debounceTimer);

    if (!cleanVal) {
      this.state.usernameStatus = 'idle';
      this.state.canContinue = false;
      this.renderStatus();
      return;
    }

    const formatCheck = UsernameService.validateFormat(cleanVal);
    if (!formatCheck.valid) {
      this.state.usernameStatus = 'invalid';
      this.state.usernameError = formatCheck.message;
      this.state.canContinue = false;
      this.renderStatus();
      return;
    }

    this.state.usernameStatus = 'checking';
    this.state.canContinue = false;
    this.renderStatus();

    const runCheck = async () => {
      this.state.isCheckingUsername = true;
      const result = await UsernameService.checkAvailability(cleanVal);
      this.state.isCheckingUsername = false;

      if (this.state.username === cleanVal) {
        if (result.valid) {
          this.state.usernameStatus = 'available';
          this.state.canContinue = true;
        } else {
          this.state.usernameStatus = result.status || 'taken';
          this.state.usernameError = result.message || 'Username unavailable';
          this.state.canContinue = false;
        }
        this.renderStatus();
      }
    };

    if (immediate) {
      runCheck();
    } else {
      this.debounceTimer = setTimeout(runCheck, 280);
    }
  },

  renderStatus() {
    if (!this.usernameInputBox || !this.usernameStatusIndicator || !this.usernameValidationMsg) return;

    const { usernameStatus, username, usernameError, canContinue } = this.state;

    this.usernameInputBox.classList.remove('input-error');
    this.usernameValidationMsg.className = 'feedback-msg';

    if (usernameStatus === 'idle') {
      this.usernameStatusIndicator.innerHTML = '';
      this.usernameValidationMsg.style.visibility = 'hidden';
    } else if (usernameStatus === 'checking') {
      this.usernameStatusIndicator.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-lime"></i>';
      this.usernameValidationMsg.className = 'feedback-msg text-muted';
      this.usernameValidationMsg.style.visibility = 'visible';
      this.usernameValidationMsg.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Checking availability...';
    } else if (usernameStatus === 'available') {
      this.usernameStatusIndicator.innerHTML = '<i class="fa-solid fa-circle-check text-lime"></i>';
      this.usernameValidationMsg.className = 'feedback-msg text-lime';
      this.usernameValidationMsg.style.visibility = 'visible';
      this.usernameValidationMsg.innerHTML = `<i class="fa-solid fa-circle-check"></i> <strong>${username}</strong> is available!`;
    } else if (usernameStatus === 'taken') {
      this.usernameInputBox.classList.add('input-error');
      this.usernameStatusIndicator.innerHTML = '<i class="fa-solid fa-circle-xmark text-danger"></i>';
      this.usernameValidationMsg.className = 'feedback-msg text-danger';
      this.usernameValidationMsg.style.visibility = 'visible';
      this.usernameValidationMsg.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> ${usernameError || `@${username} is already taken.`}`;
    } else if (usernameStatus === 'invalid') {
      this.usernameInputBox.classList.add('input-error');
      this.usernameStatusIndicator.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-danger"></i>';
      this.usernameValidationMsg.className = 'feedback-msg text-danger';
      this.usernameValidationMsg.style.visibility = 'visible';
      this.usernameValidationMsg.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${usernameError || 'Invalid username format.'}`;
    }

    if (this.btnSignupContinue) {
      this.btnSignupContinue.disabled = !canContinue;
    }
  },

  goToStep(step) {
    this.state.currentStep = step;
    const step1Body = document.getElementById('signupStep1Body');
    const step2Body = document.getElementById('signupStep2Body');
    const stepSuccessBody = document.getElementById('signupStepSuccessBody');
    const stepperItems = document.querySelectorAll('.auth-stepper .stepper-item');
    const stepperLines = document.querySelectorAll('.auth-stepper .stepper-line');

    if (step === 1) {
      if (step1Body) step1Body.style.display = 'block';
      if (step2Body) step2Body.style.display = 'none';
      if (stepSuccessBody) stepSuccessBody.style.display = 'none';

      stepperItems.forEach((item, idx) => {
        const circle = item.querySelector('.stepper-circle');
        if (idx === 0) {
          item.className = 'stepper-item active';
          if (circle) circle.innerHTML = '<span>1</span>';
        } else {
          item.className = 'stepper-item';
          if (circle) circle.innerHTML = `<span>${idx + 1}</span>`;
        }
      });
      stepperLines.forEach((line, idx) => {
        line.className = idx === 0 ? 'stepper-line active-line' : 'stepper-line';
      });
      setTimeout(() => this.signupUsernameInput?.focus(), 60);
    } else if (step === 2) {
      if (step1Body) step1Body.style.display = 'none';
      if (step2Body) step2Body.style.display = 'block';
      if (stepSuccessBody) stepSuccessBody.style.display = 'none';

      const step2UserDisplay = document.getElementById('step2UsernameDisplay');
      if (step2UserDisplay) step2UserDisplay.textContent = `@${this.state.username}`;

      stepperItems.forEach((item, idx) => {
        const circle = item.querySelector('.stepper-circle');
        if (idx === 0) {
          item.className = 'stepper-item completed';
          if (circle) circle.innerHTML = '<i class="fa-solid fa-check"></i>';
        } else if (idx === 1) {
          item.className = 'stepper-item active';
          if (circle) circle.innerHTML = '<span>2</span>';
        } else {
          item.className = 'stepper-item';
          if (circle) circle.innerHTML = `<span>${idx + 1}</span>`;
        }
      });
      stepperLines.forEach((line, idx) => {
        line.className = idx === 0 ? 'stepper-line active-line' : 'stepper-line';
      });

      const emailInput = document.getElementById('signupEmailInput');
      setTimeout(() => emailInput?.focus(), 60);
    } else if (step === 4) {
      if (step1Body) step1Body.style.display = 'none';
      if (step2Body) step2Body.style.display = 'none';
      if (stepSuccessBody) stepSuccessBody.style.display = 'block';

      const successDisplay = document.getElementById('stepSuccessUsernameDisplay');
      if (successDisplay) successDisplay.textContent = `@${this.state.username}`;

      stepperItems.forEach((item) => {
        item.className = 'stepper-item active';
        const circle = item.querySelector('.stepper-circle');
        if (circle) circle.innerHTML = '<i class="fa-solid fa-check"></i>';
      });
      stepperLines.forEach((line) => {
        line.className = 'stepper-line active-line';
      });
    }
  },

  bindStep2Events() {
    const step2Form = document.getElementById('signupDetailsForm');
    const btnBackToStep1 = document.getElementById('btnBackToStep1');
    const btnTogglePwd = document.getElementById('btnToggleSignupPwd');
    const pwdInput = document.getElementById('signupPasswordInput');
    const emailInput = document.getElementById('signupEmailInput');
    const errorMsgArea = document.getElementById('step2ErrorMsg');
    const btnSubmitDetails = document.getElementById('btnSignupSubmitDetails');
    const btnGoToFeed = document.getElementById('btnGoToFeedAfterSignup');

    btnBackToStep1?.addEventListener('click', () => {
      this.goToStep(1);
    });

    btnTogglePwd?.addEventListener('click', () => {
      if (!pwdInput) return;
      const isPwd = pwdInput.type === 'password';
      pwdInput.type = isPwd ? 'text' : 'password';
      btnTogglePwd.innerHTML = isPwd ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
    });

    step2Form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailVal = emailInput?.value?.trim() || '';
      const pwdVal = pwdInput?.value || '';

      if (!emailVal || !pwdVal) {
        if (errorMsgArea) {
          errorMsgArea.textContent = 'Please fill out all fields.';
          errorMsgArea.style.display = 'block';
        }
        return;
      }

      if (pwdVal.length < 6) {
        if (errorMsgArea) {
          errorMsgArea.textContent = 'Password must be at least 6 characters long.';
          errorMsgArea.style.display = 'block';
        }
        return;
      }

      if (errorMsgArea) errorMsgArea.style.display = 'none';

      const btnText = btnSubmitDetails?.querySelector('.btn-text');
      const btnArrow = btnSubmitDetails?.querySelector('.btn-arrow-icon');
      const btnSpinner = btnSubmitDetails?.querySelector('.btn-spinner');

      if (btnText) btnText.textContent = 'Creating Account...';
      if (btnArrow) btnArrow.style.display = 'none';
      if (btnSpinner) btnSpinner.style.display = 'inline-block';
      if (btnSubmitDetails) btnSubmitDetails.disabled = true;

      try {
        const res = await authApi.register({
          username: this.state.username,
          email: emailVal,
          password: pwdVal
        });

        authManager.setSession(res.token, res.user);
        toast.success(`Account created! Welcome @${res.user.username}!`);
        this.goToStep(4);
      } catch (err) {
        if (errorMsgArea) {
          errorMsgArea.textContent = err.message || 'Registration failed. Please try again.';
          errorMsgArea.style.display = 'block';
        }
      } finally {
        if (btnText) btnText.textContent = 'Create Account';
        if (btnArrow) btnArrow.style.display = 'inline-block';
        if (btnSpinner) btnSpinner.style.display = 'none';
        if (btnSubmitDetails) btnSubmitDetails.disabled = false;
      }
    });

    btnGoToFeed?.addEventListener('click', () => {
      router.navigate('feed');
    });
  },

  handleContinue() {
    if (!this.state.canContinue) return;

    const continueBtn = this.btnSignupContinue;
    const btnText = continueBtn?.querySelector('.btn-text');
    const btnArrow = continueBtn?.querySelector('.btn-arrow-icon');
    const btnSpinner = continueBtn?.querySelector('.btn-spinner');

    if (btnText) btnText.textContent = 'Saving...';
    if (btnArrow) btnArrow.style.display = 'none';
    if (btnSpinner) btnSpinner.style.display = 'inline-block';
    if (continueBtn) continueBtn.disabled = true;

    setTimeout(() => {
      if (btnText) btnText.textContent = 'Continue';
      if (btnArrow) btnArrow.style.display = 'inline-block';
      if (btnSpinner) btnSpinner.style.display = 'none';
      if (continueBtn) continueBtn.disabled = false;

      this.goToStep(2);
    }, 200);
  }
};
