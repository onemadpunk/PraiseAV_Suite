const heading = /^\s*\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Tag|Interlude|Ending|Vamp|Instrumental)([^\]]*)\]\s*$/i;
const nameOf = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

// Keep the church's library chart intact; create a service-specific reading
// order, including repeated sections such as a final chorus.
export function arrangeChordPro(chordPro: string, order: string[] | undefined): string {
  if (!order?.length || !chordPro.trim()) return chordPro;
  const sections: Array<{ name: string; lines: string[] }> = [];
  const prelude: string[] = [];
  let current: { name: string; lines: string[] } | null = null;
  for (const line of chordPro.replace(/\r\n?/g, '\n').split('\n')) {
    const match = heading.exec(line);
    if (match) {
      current = { name: (match[1] + match[2]).trim(), lines: [line] };
      sections.push(current);
    } else if (current) current.lines.push(line);
    else prelude.push(line);
  }
  const arranged = order.flatMap((name) => sections.filter((section) => nameOf(section.name) === nameOf(name)));
  if (!arranged.length || order.some((name) => !sections.some((section) => nameOf(section.name) === nameOf(name)))) return chordPro;
  return [...prelude, ...arranged.flatMap((section) => [...section.lines, ''])].join('\n').trim();
}
