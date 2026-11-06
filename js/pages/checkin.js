import { $, esc, showMessage } from '../utils/dom.js';
import { checkIn } from '../services/attendance.js';

const form = $('#checkin-form');
const message = $('#checkin-message');
const button = $('#checkin-btn');
const result = $('#checkin-result');
const codeInput = $('#code');

// Keep the code tidy: capitals and letters/numbers only
codeInput.addEventListener('input', () => {
  codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  showMessage(message, 'error', '');

  const values = {
    code: codeInput.value.trim(),
    firstName: $('#first-name').value.trim(),
    lastName: $('#last-name').value.trim(),
    employeeNumber: $('#employee-number').value.trim()
  };

  if (Object.values(values).some((value) => !value)) {
    showMessage(message, 'error', 'Please fill in every field.');
    return;
  }

  button.disabled = true;
  button.textContent = 'Checking in...';

  try {
    const response = await checkIn(values);
    showResult(response);
  } catch (error) {
    showMessage(message, 'error', error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Check in';
  }
});

function showResult(response) {
  const status = response.already ? null : response.status;

  result.innerHTML = `
    <div class="result-icon ${status === 'late' ? 'late' : ''}">✓</div>
    <h2>${response.already ? 'Already checked in' : 'You are checked in'}</h2>
    <p class="result-name">${esc(response.name)}</p>
    <p class="subtitle">${esc(response.class)}</p>
    ${status ? `<span class="status-pill status-${esc(status)}">${esc(status)}</span>` : ''}
    <button class="secondary-btn" type="button" id="another-btn">Check in someone else</button>
  `;

  form.hidden = true;
  result.hidden = false;
  $('#another-btn').addEventListener('click', reset);
}

function reset() {
  form.reset();
  showMessage(message, 'error', '');
  result.hidden = true;
  form.hidden = false;
  codeInput.focus();
}
