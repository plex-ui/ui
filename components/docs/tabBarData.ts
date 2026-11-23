/**
 * The Tab Bar examples' app, one music app on React, Vue and React Native: its sections, the rows each one lists (a
 * title and, at the row's end, a detail), the badges and the song in the accessory. The icons stay with each
 * framework's demo.
 */
export type TabBarRow = readonly [title: string, detail?: string];

/** The tabs in their order: the example shows the first two to five */
export const TAB_BAR_TABS = [
  { value: 'home', label: 'Home' },
  { value: 'new', label: 'New' },
  { value: 'radio', label: 'Radio' },
  { value: 'library', label: 'Library' },
  { value: 'charts', label: 'Charts' },
] as const;

/** The prominent tab, a key destination in a circle of its own */
export const TAB_BAR_PROMINENT = { value: 'store', label: 'Store' } as const;

/** A count on one tab and a short word on another */
export const TAB_BAR_BADGES: Record<string, string | number> = { new: 3, radio: 'Live' };

/** The song in the bottom accessory */
export const NOW_PLAYING = 'Blinding Lights · The Weeknd';

/** What each section lists, the search tab and the prominent one included */
export const TAB_BAR_ROWS: Record<string, readonly TabBarRow[]> = {
  home: [
    ['Favorites Mix', 'Playlist'],
    ['After Hours', 'The Weeknd'],
    ['Chill Mix', 'Playlist'],
    ['Future Nostalgia', 'Dua Lipa'],
    ['SOS', 'SZA'],
    ['Midnights', 'Taylor Swift'],
    ['Get Up! Mix', 'Playlist'],
    ["Harry's House", 'Harry Styles'],
    ['Renaissance', 'Beyoncé'],
    ['Discovery Station', 'Radio'],
    ['Happier Than Ever', 'Billie Eilish'],
    ['Planet Her', 'Doja Cat'],
    ['Friends Mix', 'Playlist'],
    ['Sour', 'Olivia Rodrigo'],
    ['Starboy', 'The Weeknd'],
    ['Positions', 'Ariana Grande'],
  ],
  new: [
    ['The Life of a Showgirl', 'Taylor Swift'],
    ["Man's Best Friend", 'Sabrina Carpenter'],
    ['Virgin', 'Lorde'],
    ['Something Beautiful', 'Miley Cyrus'],
    ['Mayhem', 'Lady Gaga'],
    ['Hurry Up Tomorrow', 'The Weeknd'],
    ['Debí Tirar Más Fotos', 'Bad Bunny'],
    ['GNX', 'Kendrick Lamar'],
    ['Chromakopia', 'Tyler, The Creator'],
    ['Moon Music', 'Coldplay'],
    ["Short n' Sweet", 'Sabrina Carpenter'],
    ['Hit Me Hard and Soft', 'Billie Eilish'],
    ['Eternal Sunshine', 'Ariana Grande'],
    ['Cowboy Carter', 'Beyoncé'],
    ['Brat', 'Charli XCX'],
    ['The Tortured Poets Department', 'Taylor Swift'],
  ],
  radio: [
    ['Morning Mix', 'Live'],
    ['Hits Countdown', 'Live'],
    ['Pop Hits'],
    ['Hip-Hop Now'],
    ['Chill Station'],
    ['Indie Spotlight'],
    ['Jazz Lounge'],
    ['Classic Rock'],
    ['Country Roads'],
    ['Dance Floor'],
    ['Latin Heat'],
    ['R&B Classics'],
    ['K-Pop Now'],
    ['Lo-Fi Beats'],
    ['Classical Focus'],
    ['Throwback Hits'],
  ],
  library: [
    ['Playlists', '24'],
    ['Artists', '112'],
    ['Albums', '86'],
    ['Songs', '1,204'],
    ['Made for You', '6'],
    ['Music Videos', '18'],
    ['Genres', '14'],
    ['Compilations', '9'],
    ['Composers', '31'],
    ['Downloaded', '342'],
  ],
  charts: [
    ['Top 100: Global'],
    ['Top 100: USA'],
    ['Top 100: UK'],
    ['Top 100: Canada'],
    ['Top 100: Australia'],
    ['Top 100: Germany'],
    ['Top 100: France'],
    ['Top 100: Japan'],
    ['Top 100: Brazil'],
    ['Top 100: Mexico'],
    ['Daily Top 25: Pop'],
    ['Daily Top 25: Hip-Hop'],
    ['Daily Top 25: Country'],
    ['Daily Top 25: Rock'],
    ['Daily Top 25: Latin'],
    ['Daily Top 25: K-Pop'],
  ],
  search: [
    ['Pop'],
    ['Hip-Hop'],
    ['Rock'],
    ['Jazz'],
    ['Classical'],
    ['Country'],
    ['Electronic'],
    ['R&B'],
    ['Latin'],
    ['K-Pop'],
    ['Indie'],
    ['Metal'],
    ['Blues'],
    ['Soul'],
    ['Reggae'],
    ['Ambient'],
  ],
  store: [
    ['Blinding Lights', '$1.29'],
    ['Espresso', '$1.29'],
    ['Birds of a Feather', '$1.29'],
    ['Flowers', '$1.29'],
    ['As It Was', '$1.29'],
    ['Levitating', '$1.29'],
    ['Anti-Hero', '$1.29'],
    ['Good Luck, Babe!', '$1.29'],
    ['Hurry Up Tomorrow', '$11.99'],
    ["Short n' Sweet", '$10.99'],
    ['GNX', '$10.99'],
    ['Mayhem', '$11.99'],
    ['Brat', '$9.99'],
    ['Moon Music', '$10.99'],
    ['SOS', '$12.99'],
    ['After Hours', '$9.99'],
  ],
};
