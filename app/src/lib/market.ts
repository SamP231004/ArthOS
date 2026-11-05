// Shared with web/src/lib/market.ts: keep both copies identical.
/**
 * Indian equity market session (NSE/BSE): Monday–Friday, 9:15 am – 3:30 pm IST.
 * Exchange holidays aren't modelled, so a weekday holiday reads as "open" during session hours.
 */
export type MarketStatus = { open: boolean; label: string; detail: string };

const OPEN_MIN = 9 * 60 + 15;
const CLOSE_MIN = 15 * 60 + 30;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function indianMarketStatus(now: Date = new Date()): MarketStatus {
  // Wall-clock time in IST regardless of the viewer's timezone (IST has no DST: UTC+5:30).
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60_000);
  const day = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const weekday = day >= 1 && day <= 5;

  if (weekday && mins >= OPEN_MIN && mins < CLOSE_MIN) {
    const left = CLOSE_MIN - mins;
    return { open: true, label: "Market open", detail: `closes in ${left >= 60 ? `${Math.floor(left / 60)}h ${left % 60}m` : `${left}m`}` };
  }
  // next session start
  let add = weekday && mins < OPEN_MIN ? 0 : 1;
  let next = (day + add) % 7;
  while (next === 0 || next === 6) {
    add++;
    next = (day + add) % 7;
  }
  const when = add === 0 ? "today" : add === 1 ? "tomorrow" : DAYS[next];
  return { open: false, label: "Market closed", detail: `opens ${when} 9:15 am IST` };
}
