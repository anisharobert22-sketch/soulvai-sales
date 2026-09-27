const { query } = require("../db/queries");

/**
 * Rotates through the currently-available users of `role` in an org, in a
 * stable order, resuming after whoever got the last one - not weighted,
 * not load-aware, just "next in line," which is what the plan asked for
 * ("Round robin with an available toggle per CCE"). Returns the assigned
 * user id, or null if nobody in that role is marked available right now.
 */
async function assignRoundRobin(orgId, role) {
  const { rows: candidates } = await query(
    "SELECT id FROM users WHERE org_id = $1 AND role = $2 AND available = true AND active = true ORDER BY id",
    [orgId, role]
  );
  if (candidates.length === 0) return null;

  const { rows: pointerRows } = await query(
    "SELECT last_assigned_user_id FROM round_robin_pointers WHERE org_id = $1 AND role = $2",
    [orgId, role]
  );
  const lastId = pointerRows[0]?.last_assigned_user_id;

  let nextIndex = 0;
  if (lastId) {
    const lastIndex = candidates.findIndex((c) => c.id === lastId);
    // If the last-assigned person is no longer in the available list
    // (they went unavailable, or left), just start from the top rather
    // than guessing where they'd have been.
    nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % candidates.length;
  }

  const chosen = candidates[nextIndex].id;

  await query(
    `INSERT INTO round_robin_pointers (org_id, role, last_assigned_user_id, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (org_id, role) DO UPDATE SET last_assigned_user_id = $3, updated_at = now()`,
    [orgId, role, chosen]
  );

  return chosen;
}

module.exports = { assignRoundRobin };
