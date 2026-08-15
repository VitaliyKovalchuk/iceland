/** One glyph per category, drawn at 11px inside a coloured disc.
 *  Paths are hand-kept simple — anything fussy turns to mud at this size.
 *  All draw inside a 24×24 box with stroke-based shapes so one style fits all. */

export const GLYPH: Record<string, string> = {
  // water
  waterfall:
    '<path d="M7 3v9M12 3v9M17 3v9" /><path d="M4 15c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2" /><path d="M4 19c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2" />',
  hot_spring:
    '<path d="M8 13c0-3 3-3 3-6S8 4 8 2" /><path d="M14 13c0-3 3-3 3-6s-3-3-3-5" /><path d="M3 18c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2" /><path d="M3 22c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1" />',
  baths:
    '<path d="M4 12h16v3a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5v-3Z" /><path d="M7 12V5a2 2 0 0 1 4 0" /><path d="M11 6h3" />',
  beach:
    '<circle cx="17" cy="6" r="3" /><path d="M2 19c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2" /><path d="M3 15c3-3 8-4 12-3" />',
  coast:
    '<path d="M2 20h20" /><path d="M4 20 10 7l5 8 3-4 4 9" />',
  // fire and rock
  volcano:
    '<path d="M9 4h6" /><path d="M10 8 3 20h18L14 8" /><path d="M12 4v4" />',
  cave: '<path d="M3 21V13a9 9 0 0 1 18 0v8" /><path d="M9 21v-6a3 3 0 0 1 6 0v6" />',
  // looking at things
  viewpoint:
    '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" /><circle cx="12" cy="12" r="3" />',
  attraction:
    '<path d="m12 2 3 6.5 7 .9-5 4.8 1.2 7L12 18l-6.2 3.2L7 14.2l-5-4.8 7-.9L12 2Z" />',
  nature:
    '<path d="M12 22V12" /><path d="M12 12c0-4 3-7 7-7 0 4-3 7-7 7Z" /><path d="M12 16c0-3-2-5-5-5 0 3 2 5 5 5Z" />',
  // built
  museum:
    '<path d="M3 10h18" /><path d="M12 3 3 8h18l-9-5Z" /><path d="M6 10v8M10 10v8M14 10v8M18 10v8" /><path d="M3 21h18" />',
  historic:
    '<path d="M5 21V8l4-3v16" /><path d="M9 21V9l6 3v9" /><path d="M15 21v-6l4 2v4" /><path d="M3 21h18" />',
  // food
  restaurant:
    '<path d="M5 2v8a2 2 0 0 0 4 0V2" /><path d="M7 10v12" /><path d="M17 2c-2 2-2 6-2 8h4c0-2 0-6-2-8Z" /><path d="M17 10v12" />',
  cafe: '<path d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" /><path d="M17 9h2a3 3 0 0 1 0 6h-2" /><path d="M6 2v3M10 2v3M14 2v3" />',
  fast_food:
    '<path d="M3 8a9 4 0 0 1 18 0Z" /><path d="M3 12h18" /><path d="M4 16h16a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" />',
  bakery:
    '<path d="M4 16c0-5 3-9 8-9s8 4 8 9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M9 18V9M15 18V9" />',
  bar: '<path d="M4 4h16l-8 8Z" /><path d="M12 12v8" /><path d="M8 21h8" />',
  // services
  fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M3 21h12" /><path d="M7 9h4" /><path d="M14 10h3a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2" /><path d="M17 10V6l-2-2" />',
  supermarket:
    '<path d="M2 3h3l3 12h11" /><path d="M8 9h13l-2 6" /><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" />',
  minimarket:
    '<path d="M4 8h16l-1.5 12h-13L4 8Z" /><path d="M9 8V5a3 3 0 0 1 6 0v3" />',
};

export const glyphFor = (cat: string) => GLYPH[cat] ?? GLYPH.attraction;

/** Marker HTML: a coloured disc with the glyph knocked out in white. */
export function markerHtml(cat: string, colour: string, size = 24) {
  return (
    `<span class="mk" style="--mk:${colour};width:${size}px;height:${size}px">` +
    `<svg viewBox="0 0 24 24" width="${Math.round(size * 0.58)}" height="${Math.round(size * 0.58)}" ` +
    `fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">` +
    glyphFor(cat) +
    `</svg></span>`
  );
}
