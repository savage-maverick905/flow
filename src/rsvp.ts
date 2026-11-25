// Optimal recognition point: roughly the letter just left of the middle of the word.
export function pivotIndex(word: string): number {
  const m = word.match(/^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u);
  if (!m) return 0;
  const lead = m[1].length;
  const n = m[2].length;
  if (n === 0) return 0;
  const k = n <= 1 ? 0 : n <= 5 ? 1 : n <= 9 ? 2 : n <= 13 ? 3 : 4;
  return lead + Math.min(k, n - 1);
}

export function splitWord(word: string): [string, string, string] {
  const c = Array.from(word);
  const i = Math.min(pivotIndex(word), Math.max(0, c.length - 1));
  return [c.slice(0, i).join(''), c[i] ?? '', c.slice(i + 1).join('')];
}

// Milliseconds a word stays on screen.
export function delayFor(word: string, wpm: number, pauses: boolean): number {
  let m = 1;
  const len = word.replace(/[^\p{L}\p{N}]/gu, '').length;
  if (len > 6) m += Math.min(0.6, (len - 6) * 0.06);
  if (pauses) {
    if (/[.!?…]["'”’)\]]*$/.test(word)) m += 1;
    else if (/[,;:–—]["'”’)\]]*$/.test(word)) m += 0.5;
  }
  return (60000 / wpm) * m;
}
