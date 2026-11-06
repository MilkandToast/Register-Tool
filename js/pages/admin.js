import { $, $$, esc, showMessage } from '../utils/dom.js';
import { signIn, signOut, getCurrentAdmin, isSuperAdmin } from '../services/auth.js';
import { listClasses } from '../services/classes.js';
import { renderToday } from '../ui/today.js';
import { renderLearners } from '../ui/learners.js';
import { renderRecords } from '../ui/records.js';
import { renderAdmins } from '../ui/admins.js';

const app = $('#app');
const chip = $('#user-chip');

const TABS = [
  { id: 'today', label: 'Today', render: renderToday },
  { id: 'learners', label: 'Learners', render: renderLearners },
  { id: 'records', label: 'Records', render: renderRecords },
  { id: 'admins', label: 'Admins', render: renderAdmins, superOnly: true }
];

let admin = null;
let currentTab = 'today';

async function start() {
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    console.warn(error);
    admin = null;
  }
  render();
}

function render() {
  renderChip();
  if (admin) {
    renderDashboard();
  } else {
    renderLogin();
  }
}

// ---------- Top bar ----------
function renderChip() {
  if (!admin) {
    chip.innerHTML = '';
    return;
  }

  const name = admin.profile.full_name || admin.user.email;
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const role = isSuperAdmin(admin) ? 'Super admin' : 'Admin';

  chip.innerHTML = `
    <div class="profile-pill">
      <div class="profile-avatar">${esc(initials)}</div>
      <div class="profile-detail">
        <strong>${esc(name)}</strong>
        <span>${role}</span>
      </div>
    </div>
    <button class="secondary-btn small-btn" id="signout-btn" type="button">Sign out</button>
  `;

  $('#signout-btn').addEventListener('click', async () => {
    try {
      await signOut();
    } finally {
      admin = null;
      render();
    }
  });
}

// ---------- Login ----------
function renderLogin() {
  app.innerHTML = `
    <section class="card narrow-card">
      <div class="title-row">
        <div>
          <h1>Admin sign in</h1>
          <p class="subtitle">Sign in with your admin account.</p>
        </div>
      </div>
      <form id="login-form" class="form-grid">
        <div class="field">
          <label for="email">Email</label>
          <input id="email" class="input" type="email" autocomplete="email" required />
        </div>
        <div class="field">
          <label for="password">Password</label>
          <input id="password" class="input" type="password" autocomplete="current-password" required />
        </div>
        <button id="login-btn" class="primary-btn full" type="submit">Sign in</button>
        <div id="login-message"></div>
      </form>
    </section>
  `;

  const form = $('#login-form');
  const message = $('#login-message');
  const button = $('#login-btn');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showMessage(message, 'error', '');
    button.disabled = true;
    button.textContent = 'Signing in...';

    try {
      await signIn($('#email').value.trim(), $('#password').value);
      admin = await getCurrentAdmin();

      if (!admin) {
        await signOut();
        throw new Error('This account is not an admin.');
      }
      render();
    } catch (error) {
      showMessage(message, 'error', error.message);
      button.disabled = false;
      button.textContent = 'Sign in';
    }
  });
}

// ---------- Dashboard ----------
async function renderDashboard() {
  const isSuper = isSuperAdmin(admin);
  const tabs = TABS.filter((tab) => !tab.superOnly || isSuper);
  if (!tabs.some((tab) => tab.id === currentTab)) currentTab = 'today';

  app.innerHTML = `
    <section class="container">
      <div class="tab-bar">
        <div class="tab-group">
          ${tabs
            .map(
              (tab) => `
            <button class="tab-btn ${tab.id === currentTab ? 'is-active' : ''}" data-tab="${tab.id}" type="button">
              ${tab.label}
            </button>`
            )
            .join('')}
        </div>
        <a class="secondary-btn small-btn" href="./register.html">View register</a>
      </div>
      <div id="pane"><p class="subtitle">Loading...</p></div>
    </section>
  `;

  $$('[data-tab]', app).forEach((button) => {
    button.addEventListener('click', () => {
      currentTab = button.dataset.tab;
      renderDashboard();
    });
  });

  const pane = $('#pane');
  try {
    const classes = await listClasses();
    const tab = tabs.find((item) => item.id === currentTab);
    await tab.render(pane, { admin, isSuper, classes });
  } catch (error) {
    pane.innerHTML = `<div class="alert error">${esc(error.message)}</div>`;
  }
}

start();
