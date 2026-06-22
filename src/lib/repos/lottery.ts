import { db } from '../db';
import type { SignUp } from '../db-types';

async function nextLotteryOrder(dateId: string): Promise<number> {
  const row = await db
    .selectFrom('sign_ups')
    .select('lottery_order')
    .where('open_mic_date_id', '=', dateId)
    .where('lottery_order', 'is not', null)
    .orderBy('lottery_order', 'desc')
    .limit(1)
    .executeTakeFirst();
  return row?.lottery_order ? row.lottery_order + 1 : 1;
}

/**
 * Run the weighted lottery for the next batch of up to 4 comedians.
 * Returns the selected signup ids in display order. Writes lottery_order unless dryRun.
 */
export async function runLottery(dateId: string, opts: { dryRun?: boolean } = {}): Promise<string[]> {
  // Checked-in comedians not yet selected, oldest signup first.
  const allComedians = await db
    .selectFrom('sign_ups')
    .selectAll()
    .where('open_mic_date_id', '=', dateId)
    .where('signup_type', '=', 'comedian')
    .where('lottery_order', 'is', null)
    .where('check_in_status', 'is not', null)
    .where('check_in_status', '!=', 'not_coming')
    .orderBy('created_at', 'asc')
    .execute();

  if (allComedians.length === 0) return [];

  const lotteryEligible = allComedians.filter((c) => c.check_in_status !== 'late');
  const lateComedians = allComedians
    .filter((c) => c.check_in_status === 'late')
    .sort((a, b) => new Date(a.checked_in_at!).getTime() - new Date(b.checked_in_at!).getTime());

  // Early birds: first 5 comedians to sign up overall (stable across draws).
  const earlyBirdRows = await db
    .selectFrom('sign_ups')
    .select('id')
    .where('open_mic_date_id', '=', dateId)
    .where('signup_type', '=', 'comedian')
    .orderBy('created_at', 'asc')
    .limit(5)
    .execute();
  const earlyBirdIds = new Set(earlyBirdRows.map((r) => r.id));

  // Tickets: base 1, +2 early bird, +2 early check-in.
  const comediansWithTickets = lotteryEligible.map((c) => {
    let tickets = 1;
    if (earlyBirdIds.has(c.id)) tickets += 2;
    if (c.check_in_status === 'early') tickets += 2;
    return { id: c.id, tickets };
  });

  const lotteryPool: string[] = [];
  comediansWithTickets.forEach((c) => {
    for (let i = 0; i < c.tickets; i++) lotteryPool.push(c.id);
  });

  const lotteryWinners: string[] = [];
  const selectedIds = new Set<string>();
  const numToSelect = Math.min(4, allComedians.length);

  while (lotteryWinners.length < numToSelect && lotteryPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * lotteryPool.length);
    const selectedId = lotteryPool[randomIndex];
    if (!selectedIds.has(selectedId)) {
      lotteryWinners.push(selectedId);
      selectedIds.add(selectedId);
      for (let i = lotteryPool.length - 1; i >= 0; i--) {
        if (lotteryPool[i] === selectedId) lotteryPool.splice(i, 1);
      }
    }
  }

  // The draw decides WHO wins; signup order decides their position in the list.
  const byId = new Map<string, SignUp>(lotteryEligible.map((c) => [c.id, c]));
  lotteryWinners.sort(
    (a, b) => new Date(byId.get(a)!.created_at).getTime() - new Date(byId.get(b)!.created_at).getTime()
  );

  const selected: string[] = [...lotteryWinners];

  // Fill remaining slots with late arrivals, least-late first.
  for (const lateComedian of lateComedians) {
    if (selected.length >= numToSelect) break;
    selected.push(lateComedian.id);
  }

  if (opts.dryRun) return selected;

  const nextOrder = await nextLotteryOrder(dateId);
  await Promise.all(
    selected.map((id, index) =>
      db.updateTable('sign_ups').set({ lottery_order: nextOrder + index }).where('id', '=', id).execute()
    )
  );

  return selected;
}

/** Write an explicit admin-chosen order, appended after any already-published picks. */
export async function publishLottery(dateId: string, comedianIds: string[]): Promise<void> {
  if (comedianIds.length === 0) return;
  const nextOrder = await nextLotteryOrder(dateId);
  await Promise.all(
    comedianIds.map((id, index) =>
      db.updateTable('sign_ups').set({ lottery_order: nextOrder + index }).where('id', '=', id).execute()
    )
  );
}

/**
 * Move a comedian within the published order, or remove them when newOrder is null.
 * Renumbers everyone sequentially afterward.
 */
export async function reorderLottery(
  dateId: string,
  comedianId: string,
  newOrder: number | null
): Promise<void> {
  if (newOrder === null) {
    await db.updateTable('sign_ups').set({ lottery_order: null }).where('id', '=', comedianId).execute();
    await renumber(dateId);
    return;
  }

  const ordered = await db
    .selectFrom('sign_ups')
    .select('id')
    .where('open_mic_date_id', '=', dateId)
    .where('lottery_order', 'is not', null)
    .orderBy('lottery_order', 'asc')
    .execute();

  const ids = ordered.map((c) => c.id).filter((id) => id !== comedianId);
  ids.splice(newOrder - 1, 0, comedianId);

  await Promise.all(
    ids.map((id, index) =>
      db.updateTable('sign_ups').set({ lottery_order: index + 1 }).where('id', '=', id).execute()
    )
  );
}

async function renumber(dateId: string): Promise<void> {
  const remaining = await db
    .selectFrom('sign_ups')
    .select('id')
    .where('open_mic_date_id', '=', dateId)
    .where('lottery_order', 'is not', null)
    .orderBy('lottery_order', 'asc')
    .execute();

  await Promise.all(
    remaining.map((c, index) =>
      db.updateTable('sign_ups').set({ lottery_order: index + 1 }).where('id', '=', c.id).execute()
    )
  );
}
