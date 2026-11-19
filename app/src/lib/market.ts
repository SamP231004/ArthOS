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

/** New York's UTC offset in minutes (−240 in summer, −300 in winter), from the browser/engine's time-zone data. */
function newYorkOffset(now: Date): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(now);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
    return Math.round((asUtc - now.getTime()) / 60_000);
  } catch {
    // no time-zone data: US daylight saving runs from the second Sunday of March to the first Sunday of November
    const y = now.getUTCFullYear();
    const nthSunday = (m: number, n: number) => {
      const d = new Date(Date.UTC(y, m, 1));
      return Date.UTC(y, m, 1 + ((7 - d.getUTCDay()) % 7) + (n - 1) * 7, 7);
    };
    const t = now.getTime();
    return t >= nthSunday(2, 2) && t < nthSunday(10, 1) ? -240 : -300;
  }
}

const US_OPEN = 9 * 60 + 30;
const US_CLOSE = 16 * 60;

/** NYSE/NASDAQ session: Monday–Friday, 9:30 am – 4 pm New York time; times shown in IST. */
export function usMarketStatus(now: Date = new Date()): MarketStatus {
  const off = newYorkOffset(now);
  const ny = new Date(now.getTime() + (now.getTimezoneOffset() + off) * 60_000);
  const day = ny.getDay();
  const mins = ny.getHours() * 60 + ny.getMinutes();
  const weekday = day >= 1 && day <= 5;
  if (weekday && mins >= US_OPEN && mins < US_CLOSE) {
    const left = US_CLOSE - mins;
    return { open: true, label: 'US market open', detail: `closes in ${left >= 60 ? `${Math.floor(left / 60)}h ${left % 60}m` : `${left}m`}` };
  }
  let add = weekday && mins < US_OPEN ? 0 : 1;
  let next = (day + add) % 7;
  while (next === 0 || next === 6) {
    add++;
    next = (day + add) % 7;
  }
  // 9:30 am New York in IST (330 = IST's offset)
  const istMins = (US_OPEN + 330 - off + 24 * 60) % (24 * 60);
  const h = Math.floor(istMins / 60), m = istMins % 60;
  const time = `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
  // the IST evening of the New York day before — 'tomorrow' in New York can still be 'today' in India
  const istDayShift = US_OPEN + 330 - off >= 24 * 60 ? 1 : 0;
  const nowIst = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60_000);
  const nyDate = new Date(ny.getFullYear(), ny.getMonth(), ny.getDate() + add + istDayShift);
  const istToday = new Date(nowIst.getFullYear(), nowIst.getMonth(), nowIst.getDate());
  const days = Math.round((nyDate.getTime() - istToday.getTime()) / 86_400_000);
  const when = days <= 0 ? 'today' : days === 1 ? 'tomorrow' : DAYS[nyDate.getDay()];
  return { open: false, label: 'US market closed', detail: `opens ${when} ${time} IST` };
}
