/**
 * Prayer Board · Client Orchestrator (Vanilla JavaScript)
 *
 * Phase 1: Authentication & Screen State Coordination
 */

import {
  initAuthListener,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOutUser,
} from './auth.js';

// DOM Elements
const landingView = document.getElementById('landing-view');
const boardView = document.getElementById('board-view');
const openAuthBtn = document.getElementById('open-auth-btn');
const authModal = document.getElementById('auth-modal');
const closeAuthBtn = document.getElementById('close-auth-btn');
const tabSignIn = document.getElementById('tab-signin');
const tabSignUp = document.getElementById('tab-signup');
const googleAuthBtn = document.getElementById('google-auth-btn');
const authForm = document.getElementById('auth-form');
const displayNameGroup = document.getElementById('display-name-group');
const authDisplayName = document.getElementById('auth-display-name');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const toastEl = document.getElementById('toast');

// User details display elements
const userNameDisplay = document.getElementById('user-name-display');
const welcomeName = document.getElementById('welcome-name');
const detailName = document.getElementById('detail-name');
const detailEmail = document.getElementById('detail-email');
const detailUid = document.getElementById('detail-uid');

// Action buttons (Phase 2 & 3 triggers)
const shareRequestBtn = document.getElementById('share-request-btn');
const myJourneyBtn = document.getElementById('my-journey-btn');

// State
let authMode = 'signin'; // 'signin' | 'signup'
let toastTimeout = null;

// ============================================================================
// Toast Notification
// ============================================================================
function showToast(message, icon = '🕯️') {
  if (!toastEl) return;
  toastEl.textContent = `${icon} ${message}`;
  toastEl.classList.remove('is-hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toastEl.classList.add('is-hidden');
  }, 3400);
}

// ============================================================================
// Modal & Tab Handlers
// ============================================================================
function openModal(mode = 'signin') {
  setAuthMode(mode);
  clearError();
  authModal.classList.remove('is-hidden');
  document.body.style.overflow = 'hidden';
  if (mode === 'signup') {
    authDisplayName.focus();
  } else {
    authEmail.focus();
  }
}

function closeModal() {
  authModal.classList.add('is-hidden');
  document.body.style.overflow = '';
  clearError();
  authForm.reset();
}

function setAuthMode(mode) {
  authMode = mode;
  clearError();
  if (mode === 'signup') {
    tabSignUp.classList.add('is-active');
    tabSignUp.setAttribute('aria-selected', 'true');
    tabSignIn.classList.remove('is-active');
    tabSignIn.setAttribute('aria-selected', 'false');
    displayNameGroup.classList.remove('is-hidden');
    authSubmitBtn.textContent = 'Join Prayer Board';
  } else {
    tabSignIn.classList.add('is-active');
    tabSignIn.setAttribute('aria-selected', 'true');
    tabSignUp.classList.remove('is-active');
    tabSignUp.setAttribute('aria-selected', 'false');
    displayNameGroup.classList.add('is-hidden');
    authSubmitBtn.textContent = 'Sign In';
  }
}

function showError(msg) {
  authError.textContent = msg;
  authError.classList.remove('is-hidden');
}

function clearError() {
  authError.textContent = '';
  authError.classList.add('is-hidden');
}

function formatAuthError(err) {
  const code = err.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account was found with this email. Click "Create Account" above to register.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email. Please sign in instead.';
    case 'auth/weak-password':
      return 'Please choose a password with at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was cancelled.';
    default:
      return err.message || 'Something went wrong. Please try again.';
  }
}

// ============================================================================
// Event Listeners
// ============================================================================
openAuthBtn.addEventListener('click', () => openModal('signin'));
closeAuthBtn.addEventListener('click', closeModal);

// Backdrop click closes modal
authModal.addEventListener('click', (e) => {
  if (e.target === authModal) closeModal();
});

// Escape key closes modal
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !authModal.classList.contains('is-hidden')) {
    closeModal();
  }
});

tabSignIn.addEventListener('click', () => setAuthMode('signin'));
tabSignUp.addEventListener('click', () => setAuthMode('signup'));

// Form Submit: Email & Password
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const email = authEmail.value.trim();
  const password = authPassword.value;
  const displayName = authDisplayName.value.trim();

  if (!email || !password) {
    showError('Please fill in both email and password.');
    return;
  }

  if (authMode === 'signup' && !displayName) {
    showError('Please enter a display name or nickname.');
    return;
  }

  authSubmitBtn.disabled = true;
  const originalText = authSubmitBtn.textContent;
  authSubmitBtn.textContent = 'Holding a moment...';

  try {
    if (authMode === 'signup') {
      await signUpWithEmail(email, password, displayName);
      showToast('Welcome to the board!', '🌷');
    } else {
      await signInWithEmail(email, password);
      showToast('Welcome back!', '🕯️');
    }
    closeModal();
  } catch (err) {
    showError(formatAuthError(err));
  } finally {
    authSubmitBtn.disabled = false;
    authSubmitBtn.textContent = originalText;
  }
});

// Google Popup Sign In
googleAuthBtn.addEventListener('click', async () => {
  clearError();
  googleAuthBtn.disabled = true;

  try {
    await signInWithGoogle();
    showToast('Signed in with Google!', '🕊️');
    closeModal();
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showError(formatAuthError(err));
    }
  } finally {
    googleAuthBtn.disabled = false;
  }
});

// Sign Out
signOutBtn.addEventListener('click', async () => {
  try {
    await signOutUser();
    showToast('Peace be with you. See you soon.', '🕊️');
  } catch (err) {
    console.error('Sign out error:', err);
  }
});

// Phase 2 & 3 Gentle Placeholders
shareRequestBtn?.addEventListener('click', () => {
  showToast('Phase 1 verified! Phase 2 (Prayer Request Modal) is next.', '✍️');
});

myJourneyBtn?.addEventListener('click', () => {
  showToast('Phase 1 verified! Phase 3 (My Journey stats) is next.', '🌷');
});

// ============================================================================
// Auth State Observer
// ============================================================================
initAuthListener(({ user, profile, isSignedIn }) => {
  if (isSignedIn && user) {
    // Show Protected View
    landingView.classList.add('is-hidden');
    boardView.classList.remove('is-hidden');

    const name = profile?.displayName || user.displayName || 'Kind Neighbor';
    const email = user.email || 'Google Account';

    userNameDisplay.textContent = name;
    welcomeName.textContent = name;
    detailName.textContent = name;
    detailEmail.textContent = email;
    detailUid.textContent = user.uid;

    console.log('[Prayer Board] Active user authenticated:', {
      uid: user.uid,
      displayName: name,
      email: email,
    });
  } else {
    // Show Signed Out Soft Landing
    boardView.classList.add('is-hidden');
    landingView.classList.remove('is-hidden');
  }
});
