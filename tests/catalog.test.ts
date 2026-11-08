import { describe, expect, it } from 'vitest';
import { filterSongs, randomSong, validSong, type Song } from '../src/catalog';
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
const songs: Song[] = (parse(readFileSync(new URL('../data/musicas.csv',import.meta.url),'utf8'),{columns:true,bom:true,skip_empty_lines:true}) as Record<string,string>[]).map((row: Record<string,string>) => ({id:row.id,title:row.nome,artist:row.artista,year:Number(row.ano_real),spotifyUrl:row.link_da_faixa}));
describe('Acervo original', () => {
  it('preserva todos os registros e IDs do CSV', () => {
    expect(songs).toHaveLength(427);
    expect(new Set(songs.map(song => song.id)).size).toBe(427);
    expect(songs.every(validSong)).toBe(true);
    expect(Math.min(...songs.map(song=>song.year))).toBe(1971);
    expect(Math.max(...songs.map(song=>song.year))).toBe(2026);
  });
  it('preserva as duas entradas de Leão e seus anos originais', () => {
    const versions = songs.filter(song => song.id === '400' || song.id === '431');
    expect(versions.map(song => song.year)).toEqual([2020,2022]);
    expect(versions[0].spotifyUrl).toBe(versions[1].spotifyUrl);
  });
  it('busca sem distinguir maiúsculas e acentos e combina termos', () => {
    expect(filterSongs(songs,'MARILIA LEAO')).toHaveLength(2);
    expect(filterSongs(songs,'MARILIA LEAO',2022)).toHaveLength(1);
    expect(filterSongs(songs,'uma musica inexistente')).toHaveLength(0);
  });
  it('só retorna faixas do ano selecionado', () => {
    const results = filterSongs(songs,'',2000);
    expect(results).toHaveLength(4);
    expect(results.every(song=>song.year === 2000)).toBe(true);
  });
  it('sorteia sem repetir a faixa atual e trata anos com uma faixa', () => {
    expect(randomSong([songs[0],songs[1]],songs[0].id)?.id).toBe(songs[1].id);
    expect(randomSong([songs[0]],songs[0].id)).toBe(songs[0]);
    expect(randomSong([])).toBeUndefined();
  });
  it('rejeita links que não são faixas Spotify válidas', () => {
    expect(validSong({...songs[0],spotifyUrl:'javascript:alert(1)'})).toBe(false);
    expect(validSong({...songs[0],spotifyUrl:'https://open.spotify.com.evil/track/abc'})).toBe(false);
  });
});
