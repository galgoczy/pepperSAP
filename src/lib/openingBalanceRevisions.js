import { supabase } from './supabase';

// Approving an opening-balance revision updates the previous day's closing
// balance (which is the target day's opening balance).
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

  const previousDay = new Date(revision.target_date);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousDayStr = previousDay.toISOString().split('T')[0];

  const { error: updateError } = await supabase
    .from('house_cash')
    .update({ official_total: revision.proposed_opening_balance })
    .eq('unit_id', revision.unit_id)
    .eq('date', previousDayStr);

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
