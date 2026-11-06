import { supabase, unwrap } from '../supabase-client.js';

export async function listLearners(classId) {
  return unwrap(
    await supabase
      .from('learners')
      .select('*')
      .eq('class_id', classId)
      .order('employee_number')
  );
}

export async function addLearner({ classId, employeeNumber, firstName, lastName }) {
  const res = await supabase
    .from('learners')
    .insert({
      class_id: classId,
      employee_number: employeeNumber.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim()
    })
    .select()
    .single();

  if (res.error && res.error.code === '23505') {
    throw new Error('That employee number is already in this class.');
  }
  return unwrap(res);
}

export async function updateLearner(id, { employeeNumber, firstName, lastName }) {
  const res = await supabase
    .from('learners')
    .update({
      employee_number: employeeNumber.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim()
    })
    .eq('id', id)
    .select()
    .single();

  if (res.error && res.error.code === '23505') {
    throw new Error('That employee number is already in this class.');
  }
  return unwrap(res);
}

// Also deletes that learner's attendance records.
export async function deleteLearner(id) {
  unwrap(await supabase.from('learners').delete().eq('id', id));
}
