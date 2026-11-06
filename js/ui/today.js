import { $, esc, showMessage } from '../utils/dom.js';
import { CONFIG } from '../config.js';
import { todayISO, toTimeInput } from '../utils/time.js';
import {
  getTodaySessions,
  saveTodaySession,
  setSessionOpen,
  generateCode
} from '../services/sessions.js';
import { getReport } from '../services/attendance.js';

function nowHHMM() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CONFIG.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).format(new Date());
}

function sessionStatus(session) {
  if (!session) return { label: 'Not started', className: 'badge-neutral' };
  if (!session.is_open) return { label: 'Closed', className: 'badge-warning' };
  if (nowHHMM() > toTimeInput(session.closes_at, '09:00')) {
    return { label: 'Closed (time up)', className: 'badge-warning' };
  }
  return { label: 'Open', className: 'badge-success' };
}

async function getCounts(classes) {
  const today = todayISO();
  const entries = await Promise.all(
    classes.map(async (cls) => {
      const rows = await getReport({ classId: cls.id, from: today, to: today });
      const count = { present: 0, late: 0, absent: 0 };
      rows.forEach((row) => {
        count[row.status] += 1;
      });
      return [cls.id, count];
    })
  );
  return Object.fromEntries(entries);
}

function cardHtml(cls, session, count) {
  const status = sessionStatus(session);

  return `
    <section class="card class-card" data-class-id="${esc(cls.id)}">
      <div class="title-row">
        <div>
          <h2>${esc(cls.name)}</h2>
          <p class="subtitle">Today's check-in</p>
        </div>
        <span class="badge ${status.className}">${status.label}</span>
      </div>

      <div class="stat-row">
        <div class="stat"><span class="label">Present</span><strong>${count.present}</strong></div>
        <div class="stat"><span class="label">Late</span><strong>${count.late}</strong></div>
        <div class="stat"><span class="label">Absent</span><strong>${count.absent}</strong></div>
      </div>

      <div class="form-grid">
        <div class="field">
          <label>Class code</label>
          <div class="inline-row">
            <input class="input code-input" data-field="code" maxlength="12"
                   placeholder="Click Generate" value="${esc(session ? session.code : '')}" />
            <button class="secondary-btn" type="button" data-action="generate">Generate</button>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Late after</label>
            <input class="input" type="time" data-field="late"
                   value="${toTimeInput(session && session.late_after, '08:15')}" />
          </div>
          <div class="field">
            <label>Closes at</label>
            <input class="input" type="time" data-field="close"
                   value="${toTimeInput(session && session.closes_at, '09:00')}" />
          </div>
        </div>

        <div class="inline-row">
          <button class="primary-btn" type="button" data-action="open">
            ${session ? 'Save and open' : 'Open check-in'}
          </button>
          ${session ? '<button class="secondary-btn" type="button" data-action="close">Close now</button>' : ''}
        </div>

        <div data-role="message"></div>
      </div>
    </section>
  `;
}

export async function renderToday(root, { classes }) {
  if (!classes.length) {
    root.innerHTML = '<div class="empty-state">No classes yet.</div>';
    return;
  }

  const [sessions, counts] = await Promise.all([getTodaySessions(), getCounts(classes)]);

  root.innerHTML = `
    <div class="toolbar">
      <button class="secondary-btn small-btn" type="button" id="refresh-btn">Refresh</button>
    </div>
    <div class="class-grid">
      ${classes.map((cls) => cardHtml(cls, sessions[cls.id], counts[cls.id])).join('')}
    </div>
  `;

  $('#refresh-btn', root).addEventListener('click', () => renderToday(root, { classes }));

  root.querySelectorAll('.class-card').forEach((card) => {
    const classId = card.dataset.classId;
    const session = sessions[classId];
    const message = $('[data-role="message"]', card);
    const codeInput = $('[data-field="code"]', card);

    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    $('[data-action="generate"]', card).addEventListener('click', () => {
      codeInput.value = generateCode();
    });

    $('[data-action="open"]', card).addEventListener('click', async () => {
      try {
        await saveTodaySession({
          classId,
          code: codeInput.value || generateCode(),
          lateAfter: $('[data-field="late"]', card).value,
          closesAt: $('[data-field="close"]', card).value,
          isOpen: true
        });
        await renderToday(root, { classes });
      } catch (error) {
        showMessage(message, 'error', error.message);
      }
    });

    const closeButton = $('[data-action="close"]', card);
    if (closeButton) {
      closeButton.addEventListener('click', async () => {
        try {
          await setSessionOpen(session.id, false);
          await renderToday(root, { classes });
        } catch (error) {
          showMessage(message, 'error', error.message);
        }
      });
    }
  });
}
