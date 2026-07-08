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

// Fully revoke an already-approved revision. Setting the status to 'reverted'
// removes it from the approved anchors, so the house-cash series recomputes the
// opening balance from history again (instead of staying pinned to a fixed
// value). We also restore the previous day's stored closing (the legacy
// house_cash column that approval overwrote) back to its pre-revision value.
export async function revokeOpeningBalanceRevision(revision, reviewerId) {
  const { error } = await supabase
    .from('opening_balance_revisions')
    .update({
      status: 'reverted',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', revision.id);
  if (error) throw error;

  const column = revision.pocket === 'reserve' ? 'other_total' : 'official_total';

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
    .update({ [column]: revision.current_opening_balance })
    .eq('id', prevRow.id);

  if (updateError) {
    console.error('Error restoring house_cash for revoked revision:', updateError);
  }
}
