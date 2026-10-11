/**
 * Turns "from"/"to" (YYYY-MM-DD) into a MongoDB date filter.
 * Dates use the server's local time zone, and "to" includes the whole day.
 */
function dateRangeFilter(from, to) {
  if (!from && !to) return null;
  const range = {};
  if (from) range.$gte = new Date(`${from}T00:00:00`);
  if (to) {
    const end = new Date(`${to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    range.$lt = end;
  }
  return range;
}

/** Parses a YYYY-MM-DD date as the END of that day in local time (for estimated delivery dates). */
function endOfLocalDay(dateString) {
  return new Date(`${dateString}T23:59:59`);
}

module.exports = { dateRangeFilter, endOfLocalDay };
