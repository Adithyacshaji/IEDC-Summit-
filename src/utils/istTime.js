/**
 * Utility functions for Indian Standard Time (IST - Asia/Kolkata) date and time checks.
 */

/**
 * Returns current Date object converted explicitly to Indian Standard Time (Asia/Kolkata)
 */
export function getIndianDateTime() {
  const now = new Date();
  const istDateString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(istDateString);
}

/**
 * Checks if an event is currently LIVE based on Indian Standard Time (IST)
 */
export function isEventLiveInIST(event, istNow = getIndianDateTime()) {
  if (!event || !event.event_date || !event.time_start || !event.time_end) return false;

  // Format current IST date into YYYY-MM-DD
  const year = istNow.getFullYear();
  const month = String(istNow.getMonth() + 1).padStart(2, '0');
  const day = String(istNow.getDate()).padStart(2, '0');
  const currentIstDateStr = `${year}-${month}-${day}`;

  // Normalize event_date to YYYY-MM-DD
  let eventDateStr = event.event_date;
  if (typeof eventDateStr === 'string' && eventDateStr.includes('T')) {
    eventDateStr = eventDateStr.split('T')[0];
  }

  // 1. Date comparison in India Standard Time
  if (currentIstDateStr !== eventDateStr) {
    return false;
  }

  // 2. Time comparison in India Standard Time
  const parseTimeToMinutes = (tStr) => {
    if (!tStr) return 0;
    const parts = tStr.split(':').map((v) => parseInt(v) || 0);
    return parts[0] * 60 + parts[1];
  };

  const currentMinutes = istNow.getHours() * 60 + istNow.getMinutes();
  const startMinutes = parseTimeToMinutes(event.time_start);
  const endMinutes = parseTimeToMinutes(event.time_end);

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}
