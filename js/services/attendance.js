import { supabase, unwrap } from '../supabase-client.js';

// ---------- Public: learner check-in ----------
// The database checks the code, time, employee number and name.
export async function checkIn({ code, employeeNumber, firstName, lastName }) {
  return unwrap(
    await supabase.rpc('check_in', {
      p_code: code,
      p_employee_number: employeeNumber,
      p_first_name: firstName,
      p_last_name: lastName
    })
  );
}

// ---------- Admin: reading ----------

// Supabase returns max 1000 rows per request, so fetch in pages.
async function fetchAll(makeQuery) {
  const size = 1000;
  const all = [];
  let from = 0;
  while (true) {
    const rows = unwrap(await makeQuery().range(from, from + size - 1));
    all.push(...rows);
    if (rows.length < size) break;
    from += size;
  }
  return all;
}

// One row per learner per session (missing check-in = 'absent')
export async function getReport({ classId, from, to }) {
  return fetchAll(() => {
    let query = supabase
      .from('attendance_report')
      .select('*')
      .eq('class_id', classId)
      .order('session_date', { ascending: false })
      .order('employee_number');
    if (from) query = query.gte('session_date', from);
    if (to) query = query.lte('session_date', to);
    return query;
  });
}

// Turns report rows into the register grid:
// dates (newest first, with attended/total counts) + learners with cells per date.
// "attended" = present + late.
export function pivotReport(rows) {
  const dateMap = new Map();
  const learnerMap = new Map();

  for (const r of rows) {
    if (!dateMap.has(r.session_date)) {
      dateMap.set(r.session_date, { date: r.session_date, attended: 0, total: 0 });
    }
    const day = dateMap.get(r.session_date);
    day.total += 1;
    if (r.status === 'present' || r.status === 'late') day.attended += 1;

    if (!learnerMap.has(r.learner_id)) {
      learnerMap.set(r.learner_id, {
        learnerId: r.learner_id,
        employeeNumber: r.employee_number,
        firstName: r.first_name,
        lastName: r.last_name,
        cells: {}
      });
    }
    learnerMap.get(r.learner_id).cells[r.session_date] = {
      status: r.status,
      sessionId: r.session_id,
      checkedInAt: r.checked_in_at
    };
  }

  const dates = [...dateMap.values()].sort((a, b) => b.date.localeCompare(a.date));
  const learners = [...learnerMap.values()].sort((a, b) =>
    a.employeeNumber.localeCompare(b.employeeNumber, undefined, { numeric: true })
  );

  return { dates, learners };
}

// ---------- Admin: editing ----------

// Set a status. Creates the record if the learner had none (was absent).
export async function setStatus({ sessionId, learnerId, status }) {
  const updated = unwrap(
    await supabase
      .from('attendance')
      .update({ status })
      .eq('session_id', sessionId)
      .eq('learner_id', learnerId)
      .select()
  );
  if (updated.length) return updated[0];

  return unwrap(
    await supabase
      .from('attendance')
      .insert({ session_id: sessionId, learner_id: learnerId, status })
      .select()
      .single()
  );
}

// Removes the record, so the learner shows as absent again.
export async function deleteRecord({ sessionId, learnerId }) {
  unwrap(
    await supabase
      .from('attendance')
      .delete()
      .eq('session_id', sessionId)
      .eq('learner_id', learnerId)
  );
}

// ---------- Admin: CSV download ----------
export function downloadCsv(rows, filename = 'attendance.csv') {
  const header = ['Date', 'Class', 'Employee number', 'First name', 'Last name', 'Status', 'Checked in'];
  const lines = rows.map((r) => [
    r.session_date,
    r.class_name,
    r.employee_number,
    r.first_name,
    r.last_name,
    r.status,
    r.checked_in_at || ''
  ]);

  const csv = [header, ...lines]
    .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
