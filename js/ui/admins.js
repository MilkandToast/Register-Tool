import { $, esc, showMessage } from '../utils/dom.js';
import { listAdmins, createAdmin, removeAdmin } from '../services/admins.js';

function rowHtml(profile, currentUserId) {
  const isSuperRow = profile.role === 'super_admin';
  const isMe = profile.id === currentUserId;
  const added = new Date(profile.created_at).toLocaleDateString('en-GB');

  return `
    <tr data-id="${esc(profile.id)}" data-name="${esc(profile.full_name)}">
      <td><strong>${esc(profile.full_name)}</strong>${isMe ? ' (you)' : ''}</td>
      <td>${isSuperRow ? 'Super admin' : 'Admin'}</td>
      <td>${esc(added)}</td>
      <td class="actions-col">
        ${
          isSuperRow || isMe
            ? ''
            : '<button class="danger-btn small-btn" type="button" data-action="remove">Remove</button>'
        }
      </td>
    </tr>
  `;
}

export async function renderAdmins(root, { admin, isSuper }) {
  if (!isSuper) {
    root.innerHTML = '<div class="alert error">Only the super admin can manage admins.</div>';
    return;
  }

  root.innerHTML = `
    <section class="card">
      <div class="title-row">
        <div>
          <h2>Admins</h2>
          <p class="subtitle">Only you can add or remove admin accounts.</p>
        </div>
      </div>

      <form id="admin-form" class="admin-form">
        <input id="admin-name" class="input" placeholder="Full name" required />
        <input id="admin-email" class="input" type="email" placeholder="Email" required />
        <input id="admin-password" class="input" type="password" minlength="8"
               placeholder="Password (8+ characters)" autocomplete="new-password" required />
        <button class="primary-btn" type="submit">Create admin</button>
      </form>

      <div id="admin-message"></div>
      <div id="admin-table"></div>
    </section>
  `;

  const message = $('#admin-message', root);
  const box = $('#admin-table', root);

  async function loadList() {
    const profiles = await listAdmins();
    box.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Added</th><th class="actions-col"></th></tr>
          </thead>
          <tbody>${profiles.map((profile) => rowHtml(profile, admin.user.id)).join('')}</tbody>
        </table>
      </div>
    `;
  }

  $('#admin-form', root).addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    button.disabled = true;
    showMessage(message, 'error', '');

    try {
      await createAdmin({
        fullName: $('#admin-name', root).value.trim(),
        email: $('#admin-email', root).value.trim(),
        password: $('#admin-password', root).value
      });
      event.target.reset();
      showMessage(message, 'success', 'Admin created. They can sign in now.');
      await loadList();
    } catch (error) {
      showMessage(message, 'error', error.message);
    } finally {
      button.disabled = false;
    }
  });

  box.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="remove"]');
    if (!button) return;
    const row = button.closest('tr');

    if (!confirm(`Remove ${row.dataset.name}? They will no longer be able to sign in.`)) return;

    try {
      await removeAdmin(row.dataset.id);
      showMessage(message, 'success', 'Admin removed.');
      await loadList();
    } catch (error) {
      showMessage(message, 'error', error.message);
    }
  });

  try {
    await loadList();
  } catch (error) {
    showMessage(message, 'error', error.message);
  }
}
