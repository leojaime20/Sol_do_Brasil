import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
export async function loadCatalog(path = new URL('../data/musicas.csv', import.meta.url)) {
  const rows = parse(await readFile(path, 'utf8'), { columns: true, bom: true, skip_empty_lines: true });
  const ids = new Set();
  const songs = rows.map((row, index) => {
    const song = { id: row.id.trim(), title: row.nome.trim(), artist: row.artista.trim(), year: Number(row.ano_real), spotifyUrl: row.link_da_faixa.trim() };
    if (!/^\d+$/.test(song.id) || ids.has(song.id) || !song.title || !song.artist || !Number.isInteger(song.year)
      || song.year < 1900 || song.year > 2100 || !/^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/.test(song.spotifyUrl)) {
      throw new Error(`Registro inválido ou ID duplicado na linha ${index + 2}.`);
    }
    ids.add(song.id); return song;
  });
  if (!songs.length) throw new Error('O catálogo está vazio.');
  return songs;
}
