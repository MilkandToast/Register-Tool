import { $, esc, showMessage } from '../utils/dom.js';
import { todayISO, formatDay, formatTime } from '../utils/time.js';
import { getReport, setStatus, deleteRecord, downloadCsv } from '../services/attendance.js';

let selectedClassId = null;
let fromDate = null;
let toDate = null;

function daysAgo(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const STATUSES = ['present', 'late', 'absent'];

function rowHtml(r) {
  const day = formatDay(r.session_date);
  return `
    <tr data-session="${esc(r.session_id)}" data-learner="${esc(r.learner_id)}">
      <td>${esc(day.weekday)} ${esc(day.date)}</td>
      <td><strong>${esc(r.first_name)} ${esc(r.last_name)}</strong></td>
      <td>${esc(r.employee_number)}</td>
      <td>
        <select class="select status-select status-${esc(r.status)}" data-role="status">
          ${STATUSES.map(
            (s) => `<option value="${s}" ${s === r.status ? 'selected' : ''}>${s}</option>`
          ).join('')}
        </select>
      </td>
      <td>${esc(formatTime(r.checked_in_at))}</td>
      <td class="actions-col">
        ${
          r.checked_in_at
            ? '<button class="danger-btn small-btn" type="button" data-action="clear" title="Remove this check-in (marks absent)">Clear</button>'
            : ''
        }
      </td>
    </tr>
  `;
}

export async function renderRecords(root, { classes }) {
  if (!classes.length) {
    root.innerHTML = '<div class="empty-state">No classes yet.</div>';
    return;
  }
  if (!classes.some((cls) => cls.id === selectedClassId)) selectedClassId = classes[0].id;
  if (!toDate) toDate = todayISO();
  if (!fromDate) fromDate = daysAgo(toDate, 6);

  root.innerHTML = `
    <section class="card">
      <div class="title-row">
        <div>
          <h2>Records</h2>
          <p class="subtitle">Check or fix attendance for any day.</p>
        </div>
        <button id="csv-btn" class="secondary-btn" type="button">Download CSV</button>
      </div>

      <div class="filter-row">
        <div class="field">
          <label for="f-class">Class</label>
          <select id="f-class" class="select">
            ${classes
              .map(
                (cls) =>
                  `<option value="${esc(cls.id)}" ${cls.id === selectedClassId ? 'selected' : ''}>${esc(cls.name)}</option>`
              )
              .join('')}
          </select>
        </div>
        <div class="field">
          <label for="f-from">From</label>
          <input id="f-from" class="input" type="date" value="${esc(fromDate)}" />
        </div>
        <div class="field">
          <label for="f-to">To</label>
          <input id="f-to" class="input" type="date" value="${esc(toDate)}" />
        </div>
      </div>

      <div id="records-message"></div>
      <div id="records-table"></div>
    </section>
  `;

  const message = $('#records-message', root);
  const box = $('#records-table', root);
  let rows = [];

  async function load() {
    showMessage(message, 'error', '');
    box.innerHTML = '<p class="subtitle">Loading...</p>';

    try {
      rows = await getReport({ classId: selectedClassId, from: fromDate, to: toDate });
    } catch (error) {
      rows = [];
      box.innerHTML = '';
      showMessage(message, 'error', error.message);
      return;
    }

    if (!rows.length) {
      box.innerHTML = '<div class="empty-state">No sessions in this date range.</div>';
      return;
    }

    box.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th><th>Learner</th><th>Employee no.</th><th>Status</th><th>Checked in</th><th class="actions-col"></th>
            </tr>
          </thead>
          <tbody>${rows.map(rowHtml).join('')}</tbody>
        </table>
      </div>
    `;
  }

  $('#f-class', root).addEventListener('change', (event) => {
    selectedClassId = event.target.value;
    load();
  });

  $('#f-from', root).addEventListener('change', (event) => {
    if (event.target.value) {
      fromDate = event.target.value;
      load();
    }
  });

  $('#f-to', root).addEventListener('change', (event) => {
    if (event.target.value) {
      toDate = event.target.value;
      load();
    }
  });

  $('#csv-btn', root).addEventListener('click', () => {
    if (!rows.length) {
      showMessage(message, 'error', 'Nothing to download for this date range.');
      return;
    }
    const className = rows[0].class_name.replace(/\s+/g, '-').toLowerCase();
    downloadCsv(rows, `attendance-${className}-${fromDate}-to-${toDate}.csv`);
  });

  box.addEventListener('change', async (event) => {
    const select = event.target.closest('[data-role="status"]');
    if (!select) return;
    const row = select.closest('tr');

    try {
      await setStatus({
        sessionId: row.dataset.session,
        learnerId: row.dataset.learner,
        status: select.value
      });
      await load();
    } catch (error) {
      showMessage(message, 'error', error.message);
      await load();
    }
  });

  box.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action="clear"]');
    if (!button) return;
    const row = button.closest('tr');

    if (!confirm('Remove this check-in? The learner will show as absent.')) return;

    try {
      await deleteRecord({ sessionId: row.dataset.session, learnerId: row.dataset.learner });
      await load();
    } catch (error) {
      showMessage(message, 'error', error.message);
    }
  });

  await load();
}
