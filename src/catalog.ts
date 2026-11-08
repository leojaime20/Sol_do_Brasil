export type Song = { id: string; title: string; artist: string; year: number; spotifyUrl: string };
export function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}
export function filterSongs(songs: Song[], search: string, year?: number) {
  const terms = normalize(search).split(/\s+/).filter(Boolean);
  return songs.filter(song => (!year || song.year === year) && terms.every(term =>
    normalize(`${song.title} ${song.artist} ${song.year}`).includes(term)));
}
export function randomSong(songs: Song[], currentId?: string): Song | undefined {
  const candidates = songs.length > 1 ? songs.filter(song => song.id !== currentId) : songs;
  if (!candidates.length) return undefined;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
export function validSong(value: unknown): value is Song {
  if (!value || typeof value !== 'object') return false;
  const song = value as Song;
  return typeof song.id === 'string' && typeof song.title === 'string' && song.title.length > 0
    && typeof song.artist === 'string' && song.artist.length > 0
    && Number.isInteger(song.year) && song.year >= 1900 && song.year <= 2100
    && typeof song.spotifyUrl === 'string' && /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/.test(song.spotifyUrl);
}
