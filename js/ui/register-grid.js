import { esc } from '../utils/dom.js';
import { formatDay, formatTime } from '../utils/time.js';

const LETTER = { present: 'P', late: 'L', absent: 'A' };
const LABEL = { present: 'Present', late: 'Late', absent: 'Absent' };

function cellHtml(learner, date) {
  const cell = learner.cells[date];

  // Learner was added after this day, so there is nothing to show
  if (!cell) return '<td class="cell-empty">&middot;</td>';

  const time = cell.checkedInAt ? ` (checked in ${formatTime(cell.checkedInAt)})` : '';
  return `
    <td>
      <button class="pill pill-${esc(cell.status)}" type="button"
              data-session="${esc(cell.sessionId)}"
              data-learner="${esc(learner.learnerId)}"
              data-status="${esc(cell.status)}"
              title="${esc(LABEL[cell.status] + time)}">
        ${LETTER[cell.status] || '?'}
      </button>
    </td>
  `;
}

export function gridHtml({ dates, learners }, today) {
  if (!dates.length) {
    return '<div class="empty-state">No sessions in this date range.</div>';
  }
  if (!learners.length) {
    return '<div class="empty-state">No learners in this class yet.</div>';
  }

  const head = dates
    .map((day) => {
      const parts = formatDay(day.date);
      const label = day.date === today ? 'Today' : parts.weekday;
      return `
        <th class="day-col" scope="col">
          <span class="day-name">${esc(label)}</span>
          <span class="day-date">${esc(parts.date)}</span>
          <span class="day-count" title="Attended (present + late) out of total">${day.attended}/${day.total}</span>
        </th>
      `;
    })
    .join('');

  const body = learners
    .map(
      (learner) => `
      <tr>
        <th class="learner-col" scope="row">
          <strong>${esc(learner.firstName)} ${esc(learner.lastName)}</strong>
          <span>${esc(learner.employeeNumber)}</span>
        </th>
        ${dates.map((day) => cellHtml(learner, day.date)).join('')}
      </tr>
    `
    )
    .join('');

  return `
    <div class="grid-scroll">
      <table class="register-table">
        <thead>
          <tr>
            <th class="learner-col" scope="col">Learner</th>
            ${head}
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

// ---------- Click menu ----------
let menu = null;

export function closeCellMenu() {
  if (menu) {
    menu.remove();
    menu = null;
  }
}

function onOutsideClick(event) {
  if (menu && !menu.contains(event.target)) closeCellMenu();
}

function onEscape(event) {
  if (event.key === 'Escape') closeCellMenu();
}

// Shows Present / Late / Absent next to the pill that was clicked
export function showCellMenu(anchor, current, onPick) {
  closeCellMenu();

  menu = document.createElement('div');
  menu.className = 'cell-menu';
  menu.innerHTML = Object.keys(LABEL)
    .map(
      (status) => `
      <button type="button" class="menu-item ${status === current ? 'is-current' : ''}" data-pick="${status}">
        <span class="menu-dot status-${status}"></span>${LABEL[status]}
      </button>
    `
    )
    .join('');
  document.body.append(menu);

  const rect = anchor.getBoundingClientRect();
  const maxLeft = window.scrollX + document.documentElement.clientWidth - menu.offsetWidth - 8;
  menu.style.top = `${window.scrollY + rect.bottom + 6}px`;
  menu.style.left = `${Math.max(8, Math.min(window.scrollX + rect.left, maxLeft))}px`;

  menu.addEventListener('click', (event) => {
    const item = event.target.closest('[data-pick]');
    if (!item) return;
    const status = item.dataset.pick;
    closeCellMenu();
    onPick(status);
  });

  setTimeout(() => {
    document.addEventListener('click', onOutsideClick, { once: true });
    document.addEventListener('keydown', onEscape, { once: true });
  }, 0);
}
