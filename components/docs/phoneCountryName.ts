/** Keep the final word visible while CSS shortens only the beginning of a country name. */
export function splitPhoneCountryName(label: string): { start: string; end: string } {
  const lastSpace = label.lastIndexOf(' ');
  if (lastSpace > 0) return { start: label.slice(0, lastSpace + 1), end: label.slice(lastSpace + 1) };
  const characters = Array.from(label);
  const middle = Math.ceil(characters.length / 2);
  return { start: characters.slice(0, middle).join(''), end: characters.slice(middle).join('') };
}
