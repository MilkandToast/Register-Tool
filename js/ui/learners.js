import { $, $$, esc, showMessage } from '../utils/dom.js';
import { listLearners, addLearner, updateLearner, deleteLearner } from '../services/learners.js';

let selectedClassId = null; // remembered when you switch tabs

function rowHtml(learner) {
  return `
    <tr data-id="${esc(learner.id)}">
      <td>${esc(learner.employee_number)}</td>
      <td>${esc(learner.first_name)}</td>
      <td>${esc(learner.last_name)}</td>
      <td class="actions-col">
        <button class="secondary-btn small-btn" type="button" data-action="edit">Edit</button>
        <button class="danger-btn small-btn" type="button" data-action="delete">Delete</button>
      </td>
    </tr>
  `;
}

function editRowHtml(learner) {
  return `
    <tr data-id="${esc(learner.id)}">
      <td><input class="input" data-field="employee" value="${esc(learner.employee_number)}" /></td>
      <td><input class="input" data-field="first" value="${esc(learner.first_name)}" /></td>
      <td><input class="input" data-field="last" value="${esc(learner.last_name)}" /></td>
      <td class="actions-col">
        <button class="primary-btn small-btn" type="button" data-action="save">Save</button>
        <button class="ghost-btn small-btn" type="button" data-action="cancel">Cancel</button>
      </td>
    </tr>
  `;
}

export async function renderLearners(root, { classes }) {
  if (!classes.length) {
    root.innerHTML = '<div class="empty-state">No classes yet.</div>';
    return;
  }
  if (!classes.some((cls) => cls.id === selectedClassId)) selectedClassId = classes[0].id;

  root.innerHTML = `
    <section class="card">
      <div class="title-row">
        <div>
          <h2>Learners</h2>
          <p class="subtitle">Add, edit or remove learners in a class.</p>
        </div>
        <select id="class-select" class="select class-select">
          ${classes
            .map(
              (cls) =>
                `<option value="${esc(cls.id)}" ${cls.id === selectedClassId ? 'selected' : ''}>${esc(cls.name)}</option>`
            )
            .join('')}
        </select>
      </div>

      <form id="add-form" class="add-row">
        <input id="add-employee" class="input" placeholder="Employee number" required />
        <input id="add-first" class="input" placeholder="First name" required />
        <input id="add-last" class="input" placeholder="Surname" required />
        <button class="primary-btn" type="submit">Add learner</button>
      </form>

      <div id="learner-message"></div>
      <input id="search" class="input search-input" type="search" placeholder="Search learners" />
      <div id="learner-table"></div>
    </section>
  `;

  const message = $('#learner-message', root);
  const box = $('#learner-table', root);
  const search = $('#search', root);
  let byId = new Map();

  function applySearch() {
    const term = search.value.trim().toLowerCase();
    $$('tbody tr', box).forEach((row) => {
      row.style.display = row.textContent.toLowerCase().includes(term) ? '' : 'none';
    });
  }

  async function loadTable() {
    const learners = await listLearners(selectedClassId);
    byId = new Map(learners.map((learner) => [learner.id, learner]));

    if (!learners.length) {
      box.innerHTML = '<div class="empty-state">No learners in this class yet.</div>';
      return;
    }

    box.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employee no.</th><th>First name</th><th>Surname</th><th class="actions-col"></th>
            </tr>
          </thead>
          <tbody>${learners.map(rowHtml).join('')}</tbody>
        </table>
      </div>
    `;
    applySearch();
  }

  $('#class-select', root).addEventListener('change', (event) => {
    selectedClassId = event.target.value;
    showMessage(message, 'success', '');
    loadTable().catch((error) => showMessage(message, 'error', error.message));
  });

  search.addEventListener('input', applySearch);

  $('#add-form', root).addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      await addLearner({
        classId: selectedClassId,
        employeeNumber: $('#add-employee', root).value,
        firstName: $('#add-first', root).value,
        lastName: $('#add-last', root).value
      });
      event.target.reset();
      $('#add-employee', root).focus();
      showMessage(message, 'success', 'Learner added.');
      await loadTable();
    } catch (error) {
      showMessage(message, 'error', error.message);
    }
  });

  box.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;

    const row = button.closest('tr');
    const id = row.dataset.id;
    const learner = byId.get(id);

    try {
      if (button.dataset.action === 'edit') {
        row.outerHTML = editRowHtml(learner);
      } else if (button.dataset.action === 'cancel') {
        await loadTable();
      } else if (button.dataset.action === 'save') {
        await updateLearner(id, {
          employeeNumber: $('[data-field="employee"]', row).value,
          firstName: $('[data-field="first"]', row).value,
          lastName: $('[data-field="last"]', row).value
        });
        showMessage(message, 'success', 'Learner updated.');
        await loadTable();
      } else if (button.dataset.action === 'delete') {
        const name = `${learner.first_name} ${learner.last_name}`;
        if (!confirm(`Delete ${name}? Their attendance records will be deleted too.`)) return;
        await deleteLearner(id);
        showMessage(message, 'success', 'Learner deleted.');
        await loadTable();
      }
    } catch (error) {
      showMessage(message, 'error', error.message);
    }
  });

  await loadTable();
}
