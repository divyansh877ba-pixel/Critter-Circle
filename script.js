/* ==========================================================================
   NexusAuth - Supabase Database & Authentication Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Elements - Theme & Controls
  const htmlElement = document.documentElement;
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeIcon = document.getElementById('themeIcon');
  const themeLabel = document.getElementById('themeLabel');
  const paletteDots = document.querySelectorAll('.palette-dot');

  // Elements - Auth Views & Card
  const authView = document.getElementById('authView');
  const userDashboard = document.getElementById('userDashboard');
  const tabLogin = document.getElementById('tabLogin');
  const tabSignup = document.getElementById('tabSignup');
  const signupNameGroup = document.getElementById('signupNameGroup');
  const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
  const passwordStrengthContainer = document.getElementById('passwordStrengthContainer');
  const formTitle = document.getElementById('formTitle');
  const formSubtitle = document.getElementById('formSubtitle');
  const submitBtn = document.getElementById('submitBtn');
  const submitBtnText = document.getElementById('submitBtnText');
  const authForm = document.getElementById('authForm');
  const switchModeText = document.getElementById('switchModeText');
  const switchModeLink = document.getElementById('switchModeLink');
  const forgotPasswordLink = document.getElementById('forgotPasswordLink');

  // Inputs
  const nameInput = document.getElementById('nameInput');
  const emailInput = document.getElementById('emailInput');
  const passwordInput = document.getElementById('passwordInput');
  const confirmPasswordInput = document.getElementById('confirmPasswordInput');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPasswordBtn');

  // Modals
  const forgotModal = document.getElementById('forgotModal');
  const closeModalBtn = document.getElementById('closeModalBtn');
  const forgotForm = document.getElementById('forgotForm');
  const resetEmailInput = document.getElementById('resetEmailInput');

  const supabaseModal = document.getElementById('supabaseModal');
  const supabaseConfigBtn = document.getElementById('supabaseConfigBtn');
  const closeSupabaseModalBtn = document.getElementById('closeSupabaseModalBtn');
  const supabaseConfigForm = document.getElementById('supabaseConfigForm');
  const cfgProjectUrl = document.getElementById('cfgProjectUrl');
  const cfgAnonKey = document.getElementById('cfgAnonKey');
  const toggleAnonKeyBtn = document.getElementById('toggleAnonKeyBtn');
  const supabaseStatusDot = document.getElementById('supabaseStatusDot');
  const supabaseStatusText = document.getElementById('supabaseStatusText');

  // Dashboard Elements
  const dashAvatar = document.getElementById('dashAvatar');
  const dashName = document.getElementById('dashName');
  const dashEmail = document.getElementById('dashEmail');
  const dashUserId = document.getElementById('dashUserId');
  const dashLastSignIn = document.getElementById('dashLastSignIn');
  const dbSyncStatus = document.getElementById('dbSyncStatus');
  const dashEditNameInput = document.getElementById('dashEditNameInput');
  const btnUpdateProfile = document.getElementById('btnUpdateProfile');
  const btnSignOut = document.getElementById('btnSignOut');

  // Toast Container
  const toastContainer = document.getElementById('toastContainer');

  let currentMode = 'login'; // 'login' or 'signup'
  let supabaseClient = null;
  let currentUser = null;

  // ==========================================================================
  // 1. Supabase Client Initialization & Status Management
  // ==========================================================================
  function initSupabase() {
    const url = localStorage.getItem('supabase_project_url') || (typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.url : '');
    const key = localStorage.getItem('supabase_anon_key') || (typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.anonKey : '');

    cfgProjectUrl.value = url;
    cfgAnonKey.value = key;

    if (url && key && window.supabase) {
      try {
        supabaseClient = window.supabase.createClient(url, key);
        supabaseStatusDot.classList.add('connected');
        supabaseStatusText.textContent = 'Supabase Connected';

        // Listen for session authentication state
        supabaseClient.auth.onAuthStateChange((event, session) => {
          if (session && session.user) {
            currentUser = session.user;
            showDashboard(session.user);
          } else {
            currentUser = null;
            showAuthForm();
          }
        });

        // Check active session immediately
        supabaseClient.auth.getSession().then(({ data, error }) => {
          if (!error && data?.session?.user) {
            currentUser = data.session.user;
            showDashboard(data.session.user);
          }
        });

        return true;
      } catch (err) {
        console.error('Supabase initialization failed:', err);
        supabaseStatusDot.classList.remove('connected');
        supabaseStatusText.textContent = 'Invalid Config';
        return false;
      }
    } else {
      supabaseStatusDot.classList.remove('connected');
      supabaseStatusText.textContent = key ? 'Supabase Ready' : 'Connect DB';
      return false;
    }
  }

  initSupabase();

  // Supabase Settings Modal Handlers
  supabaseConfigBtn.addEventListener('click', () => {
    supabaseModal.classList.add('open');
  });

  closeSupabaseModalBtn.addEventListener('click', () => {
    supabaseModal.classList.remove('open');
  });

  supabaseModal.addEventListener('click', (e) => {
    if (e.target === supabaseModal) supabaseModal.classList.remove('open');
  });

  toggleAnonKeyBtn.addEventListener('click', () => {
    const isPwd = cfgAnonKey.type === 'password';
    cfgAnonKey.type = isPwd ? 'text' : 'password';
  });

  supabaseConfigForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = cfgProjectUrl.value.trim();
    const key = cfgAnonKey.value.trim();

    if (!url || !key) {
      showToast('Please provide both Project URL and Anon Key', 'error');
      return;
    }

    localStorage.setItem('supabase_project_url', url);
    localStorage.setItem('supabase_anon_key', key);

    const ok = initSupabase();
    if (ok) {
      supabaseModal.classList.remove('open');
      showToast('Connected to Supabase successfully!', 'success');
    } else {
      showToast('Could not initialize Supabase. Check credentials.', 'error');
    }
  });

  // ==========================================================================
  // 2. Dashboard & Profile Management
  // ==========================================================================
  async function showDashboard(user) {
    authView.style.display = 'none';
    userDashboard.classList.add('active');

    const displayName = user.user_metadata?.full_name || user.email.split('@')[0];
    dashName.textContent = displayName;
    dashEmail.textContent = user.email;
    dashUserId.textContent = user.id;
    dashAvatar.textContent = (displayName[0] || 'U').toUpperCase();
    dashLastSignIn.textContent = user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Just now';
    dashEditNameInput.value = displayName;

    // Fetch database profile from public.profiles table
    if (supabaseClient) {
      fetchDatabaseProfile(user.id);
    } else {
      dbSyncStatus.textContent = 'Mock Session Active';
      dbSyncStatus.style.color = '#10b981';
    }
  }

  function showAuthForm() {
    userDashboard.classList.remove('active');
    authView.style.display = 'block';
  }

  async function fetchDatabaseProfile(userId) {
    if (!supabaseClient) return;
    dbSyncStatus.textContent = 'Syncing...';
    dbSyncStatus.style.color = '#f59e0b';

    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Profile fetch notice:', error.message);
        dbSyncStatus.textContent = 'Auth Active';
        dbSyncStatus.style.color = '#10b981';
      } else if (data) {
        if (data.full_name) {
          dashName.textContent = data.full_name;
          dashAvatar.textContent = data.full_name[0].toUpperCase();
          dashEditNameInput.value = data.full_name;
        }
        dbSyncStatus.textContent = 'DB Synced';
        dbSyncStatus.style.color = '#10b981';
      } else {
        dbSyncStatus.textContent = 'Ready in DB';
        dbSyncStatus.style.color = '#10b981';
      }
    } catch (err) {
      console.error('DB profile query error:', err);
      dbSyncStatus.textContent = 'Active';
    }
  }

  // Update profile in Supabase Database or Mock
  btnUpdateProfile.addEventListener('click', async () => {
    const newName = dashEditNameInput.value.trim();
    if (!newName) {
      showToast('Please enter a valid name', 'error');
      return;
    }

    if (!supabaseClient || (currentUser && currentUser.id && currentUser.id.startsWith('usr_mock_'))) {
      if (currentUser) {
        currentUser.user_metadata = currentUser.user_metadata || {};
        currentUser.user_metadata.full_name = newName;
      }
      dashName.textContent = newName;
      dashAvatar.textContent = (newName[0] || 'A').toUpperCase();
      const stored = localStorage.getItem('critter_auth_user');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          parsed.name = newName;
          parsed.handle = '@' + newName.toLowerCase().replace(/\s+/g, '.');
          localStorage.setItem('critter_auth_user', JSON.stringify(parsed));
        } catch(e) {}
      }
      showToast(`Profile updated to "${newName}"! 🌿`, 'success');
      return;
    }

    btnUpdateProfile.disabled = true;
    btnUpdateProfile.textContent = 'Saving...';

    try {
      // 1. Update Supabase Auth user metadata
      await supabaseClient.auth.updateUser({
        data: { full_name: newName }
      });

      // 2. Upsert into public.profiles table
      const { error } = await supabaseClient
        .from('profiles')
        .upsert({
          id: currentUser.id,
          full_name: newName,
          email: currentUser.email,
          updated_at: new Date().toISOString()
        });

      btnUpdateProfile.disabled = false;
      btnUpdateProfile.textContent = 'Save to DB';

      if (error) {
        console.warn('Table upsert notice:', error.message);
        showToast(`User name updated to "${newName}"`, 'success');
      } else {
        showToast('Profile updated in Supabase Database!', 'success');
      }

      dashName.textContent = newName;
      dashAvatar.textContent = newName[0].toUpperCase();
    } catch (err) {
      btnUpdateProfile.disabled = false;
      btnUpdateProfile.textContent = 'Save to DB';
      showToast(err.message || 'Error updating profile', 'error');
    }
  });

  // Sign Out Handler
  btnSignOut.addEventListener('click', async () => {
    if (supabaseClient) {
      btnSignOut.textContent = 'Signing out...';
      try {
        await supabaseClient.auth.signOut();
      } catch (e) {}
      btnSignOut.textContent = 'Sign Out';
    }
    currentUser = null;
    localStorage.removeItem('critter_auth_user');
    showToast('Signed out successfully', 'info');
    showAuthForm();
  });

  // ==========================================================================
  // 3. Theme Palette Management
  // ==========================================================================
  const paletteNames = {
    emerald: 'Emerald & Mint Tech',
    ocean: 'Midnight Ocean & Cyan',
    sunset: 'Sunset Crimson & Amber',
    violet: 'Violet Dream & Pink',
    monochrome: 'Titanium Monochrome'
  };

  const savedPalette = localStorage.getItem('theme-palette') || 'emerald';

  function applyPalette(paletteKey, notify = false) {
    if (!paletteNames[paletteKey]) paletteKey = 'emerald';
    htmlElement.setAttribute('data-palette', paletteKey);
    localStorage.setItem('theme-palette', paletteKey);

    paletteDots.forEach(dot => {
      if (dot.getAttribute('data-palette') === paletteKey) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });

    if (notify) {
      showToast(`Palette changed to ${paletteNames[paletteKey]}`, 'info');
    }
  }

  applyPalette(savedPalette, false);

  paletteDots.forEach(dot => {
    dot.addEventListener('click', () => {
      applyPalette(dot.getAttribute('data-palette'), true);
    });
  });

  // Light / Dark Theme Mode Management
  const savedTheme = localStorage.getItem('theme-mode') || 
    (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');

  function applyThemeMode(theme) {
    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme-mode', theme);

    if (theme === 'light') {
      themeIcon.innerHTML = `
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      `;
      themeLabel.textContent = 'Light Mode';
    } else {
      themeIcon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      `;
      themeLabel.textContent = 'Dark Mode';
    }
  }

  applyThemeMode(savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    applyThemeMode(newTheme);
    showToast(`Switched to ${newTheme === 'light' ? 'Light' : 'Dark'} mode`, 'info');
  });

  // ==========================================================================
  // 4. Tab Switching (Sign In <-> Sign Up)
  // ==========================================================================
  function setAuthMode(mode) {
    currentMode = mode;
    clearErrors();

    if (mode === 'login') {
      tabLogin.classList.add('active');
      tabSignup.classList.remove('active');
      signupNameGroup.style.display = 'none';
      confirmPasswordGroup.style.display = 'none';
      passwordStrengthContainer.classList.remove('visible');
      formTitle.textContent = 'Welcome Back';
      formSubtitle.textContent = 'Sign in to your Supabase-powered account';
      submitBtnText.textContent = 'Sign In';
      switchModeText.textContent = "Don't have an account?";
      switchModeLink.textContent = 'Sign up';
    } else {
      tabSignup.classList.add('active');
      tabLogin.classList.remove('active');
      signupNameGroup.style.display = 'flex';
      confirmPasswordGroup.style.display = 'flex';
      passwordStrengthContainer.classList.add('visible');
      formTitle.textContent = 'Create Account';
      formSubtitle.textContent = 'Instant registration stored in Supabase DB';
      submitBtnText.textContent = 'Create Account';
      switchModeText.textContent = 'Already have an account?';
      switchModeLink.textContent = 'Sign in';
      updatePasswordStrength(passwordInput.value);
    }
  }

  tabLogin.addEventListener('click', () => setAuthMode('login'));
  tabSignup.addEventListener('click', () => setAuthMode('signup'));
  switchModeLink.addEventListener('click', (e) => {
    e.preventDefault();
    setAuthMode(currentMode === 'login' ? 'signup' : 'login');
  });

  // ==========================================================================
  // 5. Password Visibility Toggles
  // ==========================================================================
  function setupPasswordToggle(btn, input) {
    if (!btn || !input) return;
    btn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';

      if (isPassword) {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        `;
        btn.setAttribute('aria-label', 'Hide password');
      } else {
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="7" r="3"></circle>
          </svg>
        `;
        btn.setAttribute('aria-label', 'Show password');
      }
    });
  }

  setupPasswordToggle(togglePasswordBtn, passwordInput);
  setupPasswordToggle(toggleConfirmPasswordBtn, confirmPasswordInput);

  // ==========================================================================
  // 6. Password Strength Meter
  // ==========================================================================
  const strengthBars = [
    document.getElementById('bar1'),
    document.getElementById('bar2'),
    document.getElementById('bar3'),
    document.getElementById('bar4')
  ];
  const strengthText = document.getElementById('strengthText');

  function calculateStrength(pwd) {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[^a-zA-Z0-9]/.test(pwd)) score++;
    return score;
  }

  function updatePasswordStrength(pwd) {
    if (currentMode !== 'signup') return;
    const score = calculateStrength(pwd);

    const colors = ['#ef4444', '#f97316', '#eab308', '#10b981'];
    const labels = ['Too weak', 'Fair', 'Good', 'Strong'];

    strengthBars.forEach((bar, index) => {
      if (index < score) {
        bar.style.backgroundColor = colors[score - 1];
      } else {
        bar.style.backgroundColor = 'var(--input-border)';
      }
    });

    if (score === 0) {
      strengthText.textContent = 'None';
      strengthText.style.color = 'var(--text-dim)';
    } else {
      strengthText.textContent = labels[score - 1];
      strengthText.style.color = colors[score - 1];
    }
  }

  passwordInput.addEventListener('input', (e) => {
    updatePasswordStrength(e.target.value);
  });

  // ==========================================================================
  // 7. Validation Helpers
  // ==========================================================================
  function showError(input, message) {
    const group = input.closest('.form-group');
    if (!group) return;
    group.classList.add('has-error');
    const errorEl = group.querySelector('.field-error');
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  function clearError(input) {
    const group = input.closest('.form-group');
    if (!group) return;
    group.classList.remove('has-error');
    const errorEl = group.querySelector('.field-error');
    if (errorEl) {
      errorEl.textContent = '';
    }
  }

  function clearErrors() {
    document.querySelectorAll('.form-group').forEach(grp => grp.classList.remove('has-error'));
  }

  [nameInput, emailInput, passwordInput, confirmPasswordInput, resetEmailInput].forEach(inp => {
    if (inp) inp.addEventListener('input', () => clearError(inp));
  });

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ==========================================================================
  // 8. Real Supabase Authentication (Sign In & Sign Up)
  // ==========================================================================
  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    let hasErrors = false;

    if (currentMode === 'signup') {
      if (!nameInput.value.trim()) {
        showError(nameInput, 'Full name is required');
        hasErrors = true;
      }
    }

    const emailVal = emailInput.value.trim();
    if (!emailVal) {
      showError(emailInput, 'Email address is required');
      hasErrors = true;
    } else if (!validateEmail(emailVal)) {
      showError(emailInput, 'Please enter a valid email address');
      hasErrors = true;
    }

    const passwordVal = passwordInput.value;
    if (!passwordVal) {
      showError(passwordInput, 'Password is required');
      hasErrors = true;
    } else if (passwordVal.length < 6) {
      showError(passwordInput, 'Password must be at least 6 characters');
      hasErrors = true;
    }

    if (currentMode === 'signup') {
      if (confirmPasswordInput.value !== passwordVal) {
        showError(confirmPasswordInput, 'Passwords do not match');
        hasErrors = true;
      }
    }

    if (hasErrors) return;

    // Check if Supabase client is connected or fallback to instant mock authentication
    if (!supabaseClient || emailVal === 'alex@example.com' || emailVal === 'alex.carter@crittercircle.com') {
      submitBtn.classList.add('loading');
      submitBtn.disabled = true;

      setTimeout(() => {
        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;

        const displayName = currentMode === 'signup' ? (nameInput.value.trim() || 'Alex Carter') : (emailVal.includes('alex') ? 'Alex Carter' : emailVal.split('@')[0]);
        const mockUser = {
          id: 'usr_mock_' + Math.random().toString(36).substring(2, 9),
          email: emailVal,
          user_metadata: { full_name: displayName },
          last_sign_in_at: new Date().toISOString()
        };

        currentUser = mockUser;
        localStorage.setItem('critter_auth_user', JSON.stringify({
          name: displayName,
          handle: '@' + displayName.toLowerCase().replace(/\s+/g, '.'),
          email: emailVal,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
          bio: 'Animal lover & nature notes 🌿 Rescuing smiles one paw at a time.',
          stats: { posts: 24, followers: '1.8K', following: '326' }
        }));

        showDashboard(mockUser);
        showToast(`Signed in successfully as ${displayName}! Entering Critter Circle... 🌿`, 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 900);
      }, 450);
      return;
    }

    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    try {
      if (currentMode === 'signup') {
        // Supabase Sign Up
        const fullNameVal = nameInput.value.trim();
        const { data, error } = await supabaseClient.auth.signUp({
          email: emailVal,
          password: passwordVal,
          options: {
            data: {
              full_name: fullNameVal
            }
          }
        });

        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;

        if (error) {
          showError(passwordInput, error.message);
          showToast(error.message, 'error');
          return;
        }

        if (data.session) {
          const userObj = {
            name: fullNameVal || emailVal.split('@')[0],
            handle: '@' + (fullNameVal || emailVal.split('@')[0]).toLowerCase().replace(/\s+/g, '.'),
            email: emailVal,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
            bio: 'Critter Circle member 🌿',
            stats: { posts: 0, followers: '0', following: '0' }
          };
          localStorage.setItem('critter_auth_user', JSON.stringify(userObj));
          showToast('Account created! Entering Critter Circle... 🌿', 'success');
          setTimeout(() => {
            window.location.href = 'index.html';
          }, 900);
        } else {
          showToast('Account registered! Please check your email to verify.', 'info');
        }
      } else {
        // Supabase Sign In
        const { data, error } = await supabaseClient.auth.signInWithPassword({
          email: emailVal,
          password: passwordVal
        });

        submitBtn.classList.remove('loading');
        submitBtn.disabled = false;

        if (error) {
          showError(passwordInput, error.message);
          showToast(error.message, 'error');
          return;
        }

        const userObj = {
          name: data.user?.user_metadata?.full_name || emailVal.split('@')[0],
          handle: '@' + (data.user?.user_metadata?.full_name || emailVal.split('@')[0]).toLowerCase().replace(/\s+/g, '.'),
          email: emailVal,
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
          bio: 'Critter Circle member 🌿',
          stats: { posts: 0, followers: '0', following: '0' }
        };
        localStorage.setItem('critter_auth_user', JSON.stringify(userObj));
        showToast('Signed in successfully! Entering Critter Circle... 🌿', 'success');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 900);
      }
    } catch (err) {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      showToast(err.message || 'Authentication error', 'error');
    }
  });

  // ==========================================================================
  // 9. Forgot Password via Supabase Auth
  // ==========================================================================
  forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotModal.classList.add('open');
    if (emailInput.value.trim()) {
      resetEmailInput.value = emailInput.value.trim();
    }
    setTimeout(() => resetEmailInput.focus(), 150);
  });

  function closeResetModal() {
    forgotModal.classList.remove('open');
    clearError(resetEmailInput);
  }

  closeModalBtn.addEventListener('click', closeResetModal);

  forgotModal.addEventListener('click', (e) => {
    if (e.target === forgotModal) closeResetModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (forgotModal.classList.contains('open')) closeResetModal();
      if (supabaseModal.classList.contains('open')) supabaseModal.classList.remove('open');
    }
  });

  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailVal = resetEmailInput.value.trim();
    if (!emailVal || !validateEmail(emailVal)) {
      showError(resetEmailInput, 'Please enter a valid registered email');
      return;
    }

    if (!supabaseClient) {
      showToast('Please connect your Supabase project first', 'error');
      return;
    }

    const resetBtn = document.getElementById('resetSubmitBtn');
    resetBtn.disabled = true;
    resetBtn.textContent = 'Sending...';

    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(emailVal, {
        redirectTo: window.location.href
      });

      resetBtn.disabled = false;
      resetBtn.textContent = 'Send Reset Link';

      if (error) {
        showToast(error.message, 'error');
      } else {
        closeResetModal();
        showToast(`Reset email sent to ${emailVal}! Check your inbox.`, 'success');
        resetEmailInput.value = '';
      }
    } catch (err) {
      resetBtn.disabled = false;
      resetBtn.textContent = 'Send Reset Link';
      showToast(err.message || 'Error sending reset email', 'error');
    }
  });

  // ==========================================================================
  // 10. Social Login with Supabase OAuth
  // ==========================================================================
  document.querySelectorAll('.social-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const provider = btn.getAttribute('data-provider');
      if (!supabaseClient) {
        showToast('Please connect Supabase first', 'error');
        supabaseModal.classList.add('open');
        return;
      }

      showToast(`Initiating ${provider} login with Supabase...`, 'info');
      try {
        const { error } = await supabaseClient.auth.signInWithOAuth({
          provider: provider,
          options: {
            redirectTo: window.location.href
          }
        });
        if (error) showToast(error.message, 'error');
      } catch (err) {
        showToast(err.message || `Failed to connect with ${provider}`, 'error');
      }
    });
  });

  // ==========================================================================
  // 11. Toast Notifications
  // ==========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      `;
    } else if (type === 'error') {
      iconSvg = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      `;
    } else {
      iconSvg = `
        <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="16" x2="12" y2="12"></line>
          <line x1="12" y1="8" x2="12.01" y2="8"></line>
        </svg>
      `;
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('show');
    });

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 400);
    }, 4000);
  }

  // Expose global helper methods for mock credentials and external buttons
  window.showToast = showToast;

  window.autoFillMockCredentials = function() {
    const emailInp = document.getElementById('emailInput');
    const passInp = document.getElementById('passwordInput');
    const tabLogin = document.getElementById('tabLogin');
    if (tabLogin && !tabLogin.classList.contains('active')) {
      tabLogin.click();
    }
    if (emailInp) {
      emailInp.value = 'alex@example.com';
      emailInp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (passInp) {
      passInp.value = 'Nexus@2026!';
      passInp.dispatchEvent(new Event('input', { bubbles: true }));
    }
    showToast('Filled mock credentials: alex@example.com', 'info');
  };

  window.copyMockField = function(field) {
    const val = field === 'email' ? 'alex@example.com' : 'Nexus@2026!';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val).then(() => {
        showToast(`Copied ${field} to clipboard!`, 'info');
      }).catch(() => {
        showToast(`Copied: ${val}`, 'info');
      });
    } else {
      showToast(`Mock ${field}: ${val}`, 'info');
    }
  };
});
