import { supabase } from './supabase';

// Approving an opening-balance revision updates the previous day's closing
// balance (which is the target day's opening balance). The pocket determines
// which closing value is updated: official_total (Pénztár zseb) or other_total
// (Tartalék).
export async function approveOpeningBalanceRevision(revision, reviewerId) {
  const { error } = await supabase
    .from('opening_balance_revisions')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', revision.id);
  if (error) throw error;

  const column = revision.pocket === 'reserve' ? 'other_total' : 'official_total';

  // The opening balance is the closing of the most recent house_cash entry
  // BEFORE the target date (not necessarily the day before). Update that row.
  const { data: prevRow, error: prevError } = await supabase
    .from('house_cash')
    .select('id')
    .eq('unit_id', revision.unit_id)
    .lt('date', revision.target_date)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevError) {
    console.error('Error finding previous house_cash for approved revision:', prevError);
    return;
  }
  if (!prevRow) {
    console.warn('No previous house_cash entry to apply the revised opening balance to.');
    return;
  }

  const { error: updateError } = await supabase
    .from('house_cash')
    .update({ [column]: revision.proposed_opening_balance })
    .eq('id', prevRow.id);

  if (updateError) {
    console.error('Error updating house_cash for approved revision:', updateError);
  }
}

export async function rejectOpeningBalanceRevision(revision, reviewerId) {
  const { error } = await supabase
    .from('opening_balance_revisions')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', revision.id);
  if (error) throw error;
}

// Fully revoke the opening-balance revision(s) for a day/pocket. There can be
// several approved revisions stacked on the SAME target date over time; revoking
// only the latest would leave an earlier one as the anchor (so an older pinned
// value would reappear). So we revoke ALL approved revisions for this
// unit/date/pocket — removing every anchor — and the house-cash series recomputes
// the opening balance from history again. We also restore the previous day's
// stored closing (the legacy house_cash column that approval overwrote) back to
// the ORIGINAL, pre-any-revision value (the earliest revision's captured value).
export async function revokeOpeningBalanceRevision(revision, reviewerId) {
  // All still-approved revisions for this day/pocket, oldest first — the earliest
  // one's current_opening_balance is the true pre-revision (calculated) value.
  const { data: approved } = await supabase
    .from('opening_balance_revisions')
    .select('current_opening_balance, created_at')
    .eq('unit_id', revision.unit_id)
    .eq('target_date', revision.target_date)
    .eq('pocket', revision.pocket)
    .eq('status', 'approved')
    .order('created_at', { ascending: true });

  const { error } = await supabase
    .from('opening_balance_revisions')
    .update({
      status: 'reverted',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('unit_id', revision.unit_id)
    .eq('target_date', revision.target_date)
    .eq('pocket', revision.pocket)
    .eq('status', 'approved');
  if (error) throw error;

  const column = revision.pocket === 'reserve' ? 'other_total' : 'official_total';
  const originalValue = approved && approved.length
    ? approved[0].current_opening_balance
    : revision.current_opening_balance;

  const { data: prevRow, error: prevError } = await supabase
    .from('house_cash')
    .select('id')
    .eq('unit_id', revision.unit_id)
    .lt('date', revision.target_date)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (prevError) {
    console.error('Error finding previous house_cash for revoked revision:', prevError);
    return;
  }
  if (!prevRow) return;

  const { error: updateError } = await supabase
    .from('house_cash')
    .update({ [column]: originalValue })
    .eq('id', prevRow.id);

  if (updateError) {
    console.error('Error restoring house_cash for revoked revision:', updateError);
  }
}
