/** Pure iCal parsing (no Deno APIs) so vitest can test it. Reads only DTSTART/DTEND of each VEVENT. */
const toDate = (v: string) => {
  const m = v.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

/** Busy ranges [start_date, end_date) ending after `fromDate`. A one-day event with no DTEND blocks that night. */
export const parseIcalBusy = (ics: string, fromDate: string) => {
  const text = ics.replace(/\r?\n[ \t]/g, ""); // unfold long lines
  const out: { start_date: string; end_date: string }[] = [];
  for (const block of text.split("BEGIN:VEVENT").slice(1)) {
    const ev = block.split("END:VEVENT")[0];
    const s = ev.match(/^DTSTART[^:\n]*:(.+)$/m)?.[1];
    const e = ev.match(/^DTEND[^:\n]*:(.+)$/m)?.[1];
    const start = s ? toDate(s) : null;
    if (!start) continue;
    let end = e ? toDate(e) : null;
    if (!end || end <= start) {
      const d = new Date(`${start}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      end = d.toISOString().slice(0, 10);
    }
    if (end > fromDate) out.push({ start_date: start, end_date: end });
  }
  return out;
};
