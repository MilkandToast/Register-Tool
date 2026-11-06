import { $, $$, esc, showMessage } from '../utils/dom.js';
import { getCurrentAdmin } from '../services/auth.js';
import { listClasses } from '../services/classes.js';
import {
  getReport,
  pivotReport,
  setStatus,
  deleteRecord,
  downloadCsv
} from '../services/attendance.js';
import { todayISO } from '../utils/time.js';
import { gridHtml, showCellMenu } from '../ui/register-grid.js';

const tabsBox = $('#class-tabs');
const gridBox = $('#register-grid');
const message = $('#register-message');
const fromInput = $('#r-from');
const toInput = $('#r-to');
const printTitle = $('#print-title');

let classes = [];
let classId = null;
let rows = [];

function daysAgo(iso, days) {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function renderTabs() {
  tabsBox.innerHTML = classes
    .map(
      (cls) => `
      <button class="class-tab ${cls.id === classId ? 'is-active' : ''}" type="button" data-class="${esc(cls.id)}">
        ${esc(cls.name)}
      </button>
    `
    )
    .join('');
}

// Re-draws the grid from the rows in memory, keeping the scroll position
function render() {
  const old = $('.grid-scroll', gridBox);
  const left = old ? old.scrollLeft : 0;
  const top = old ? old.scrollTop : 0;

  gridBox.innerHTML = gridHtml(pivotReport(rows), todayISO());

  const next = $('.grid-scroll', gridBox);
  if (next) {
    next.scrollLeft = left;
    next.scrollTop = top;
  }
}

async function load() {
  showMessage(message, 'error', '');
  gridBox.innerHTML = '<p class="subtitle">Loading...</p>';

  const cls = classes.find((item) => item.id === classId);
  printTitle.textContent = `${cls.name}: ${fromInput.value} to ${toInput.value}`;

  try {
    rows = await getReport({ classId, from: fromInput.value, to: toInput.value });
    render();
  } catch (error) {
    rows = [];
    gridBox.innerHTML = '';
    showMessage(message, 'error', error.message);
  }
}

async function changeStatus(sessionId, learnerId, status) {
  try {
    // "Absent" = no check-in record at all
    if (status === 'absent') {
      await deleteRecord({ sessionId, learnerId });
    } else {
      await setStatus({ sessionId, learnerId, status });
    }

    const row = rows.find((r) => r.session_id === sessionId && r.learner_id === learnerId);
    if (row) {
      row.status = status;
      row.checked_in_at =
        status === 'absent' ? null : row.checked_in_at || new Date().toISOString();
    }
    render();
  } catch (error) {
    showMessage(message, 'error', error.message);
    await load();
  }
}

async function start() {
  let admin = null;
  try {
    admin = await getCurrentAdmin();
  } catch (error) {
    console.warn(error);
  }

  // The register is for admins only
  if (!admin) {
    window.location.replace('./admin.html');
    return;
  }

  try {
    classes = await listClasses();
  } catch (error) {
    showMessage(message, 'error', error.message);
    return;
  }

  if (!classes.length) {
    gridBox.innerHTML = '<div class="empty-state">No classes yet.</div>';
    return;
  }

  classId = classes[0].id;
  const today = todayISO();
  toInput.value = today;
  fromInput.value = daysAgo(today, 29);

  renderTabs();

  tabsBox.addEventListener('click', (event) => {
    const tab = event.target.closest('[data-class]');
    if (!tab) return;
    classId = tab.dataset.class;
    renderTabs();
    load();
  });

  [fromInput, toInput].forEach((input) => {
    input.addEventListener('change', () => {
      if (fromInput.value && toInput.value) load();
    });
  });

  $('#refresh-btn').addEventListener('click', load);
  $('#print-btn').addEventListener('click', () => window.print());

  $('#csv-btn').addEventListener('click', () => {
    if (!rows.length) {
      showMessage(message, 'error', 'Nothing to download for this date range.');
      return;
    }
    const name = rows[0].class_name.replace(/\s+/g, '-').toLowerCase();
    downloadCsv(rows, `attendance-${name}-${fromInput.value}-to-${toInput.value}.csv`);
  });

  gridBox.addEventListener('click', (event) => {
    const pill = event.target.closest('.pill');
    if (!pill) return;
    showCellMenu(pill, pill.dataset.status, (status) =>
      changeStatus(pill.dataset.session, pill.dataset.learner, status)
    );
  });

  await load();
}

start();
