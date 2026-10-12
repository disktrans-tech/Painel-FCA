// Utilitários de data (dias úteis = seg-sex)
export function d0(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
export function fmtDate(d) {
  return d ? String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear() : '—';
}
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

// dias úteis em (start, end]. Negativo se end < start.
export function busDays(start, end) {
  if (!start || !end) return 0;
  let a = d0(start), b = d0(end), sign = 1;
  if (b < a) { [a, b] = [b, a]; sign = -1; }
  let c = 0;
  const cur = new Date(a);
  while (cur < b) {
    cur.setDate(cur.getDate() + 1);
    const w = cur.getDay();
    if (w !== 0 && w !== 6) c++;
  }
  return c * sign;
}

export function addBusDays(d, n) {
  const x = d0(d);
  const step = n < 0 ? -1 : 1;
  let c = 0;
  const alvo = Math.abs(n);
  while (c < alvo) {
    x.setDate(x.getDate() + step);
    const w = x.getDay();
    if (w !== 0 && w !== 6) c++;
  }
  return x;
}

export function startOfWeek(d) { // segunda-feira
  const x = d0(d), w = x.getDay(), diff = (w === 0 ? -6 : 1 - w);
  return addDays(x, diff);
}
export function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
