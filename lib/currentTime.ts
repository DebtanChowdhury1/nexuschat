// Models have no built-in notion of "now" — without this, a question like
// "what time is it in India" gets answered with a generic "I can't access
// real-time data" deflection instead of a real answer, even though the
// device clock already has the actual answer and no web search is needed at
// all. This is injected on every turn (not gated behind shouldSearchWeb)
// since it costs nothing — no network call, just the device clock.
export function currentDateTimeContext(): string {
  const now = new Date();
  const utc = now.toISOString();
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const localOffset = `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;

  return [
    `Current date and time: ${utc} (UTC).`,
    `The user's device local time offset is ${localOffset}.`,
    "If asked for the current date/time/day in any city or timezone, calculate it directly from the UTC time above using that timezone's known UTC offset — don't say you lack real-time access, you have the actual current time right here.",
    'This is reference info only — do not mention the date, time, or the user\'s timezone unprompted. A plain greeting like "hi" gets a plain greeting back, nothing about time or location.',
  ].join(' ');
}
