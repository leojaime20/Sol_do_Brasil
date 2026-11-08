import { loadCatalog } from './catalog.mjs';
import { googleApi, documentsUrl } from './google-api.mjs';
const songs = await loadCatalog();
const years = [...new Set(songs.map(song => song.year))].sort((a,b) => a-b);
const repeatedLinks = songs.length - new Set(songs.map(song => song.spotifyUrl)).size;
console.log(`${songs.length} registros válidos. Anos: ${years[0]}–${years.at(-1)}. Links repetidos preservados: ${repeatedLinks}.`);
if (process.argv.includes('--validate')) process.exit(0);
const name = documentsUrl.replace('https://firestore.googleapis.com/v1/', '');
const writes = songs.map(song => ({ update: {
  name: `${name}/songs/${song.id}`,
  fields: Object.fromEntries(Object.entries(song).map(([key,value]) => [key, typeof value === 'number' ? { integerValue: String(value) } : { stringValue: value }]))
}}));
writes.push({update:{name:`${name}/catalog/summary`, fields:{
  count:{integerValue:String(songs.length)},
  years:{arrayValue:{values:years.map(year=>({integerValue:String(year)}))}},
  importedAt:{timestampValue:new Date().toISOString()},
  source:{stringValue:'musicas-spotify-final.csv'},
}}});
for (let start=0;start<writes.length;start+=400) {
  await googleApi(`${documentsUrl}:commit`,{method:'POST',body:JSON.stringify({writes:writes.slice(start,start+400)})});
}
console.log('Catálogo importado no Firestore com IDs estáveis (reexecutar não duplica registros).');
