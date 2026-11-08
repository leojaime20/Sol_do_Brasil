import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile } from 'node:fs/promises';
import { parse } from 'csv-parse/sync';
export default defineConfig({ base: process.env.GITHUB_PAGES === '1' ? '/Sol_do_Brasil/' : '/', plugins: [react(), {
  name: 'local-catalog-preview',
  configureServer(server) {
    // Dev server only: this endpoint and the CSV are never included in dist/.
    server.middlewares.use('/__dev/catalog', async (_request, response) => {
      try {
        const source = await readFile(new URL('./data/musicas.csv',import.meta.url),'utf8');
        const songs = (parse(source,{columns:true,bom:true,skip_empty_lines:true}) as Record<string,string>[]).map((row: Record<string,string>)=>({id:row.id,title:row.nome,artist:row.artista,year:Number(row.ano_real),spotifyUrl:row.link_da_faixa}));
        response.setHeader('Content-Type','application/json'); response.end(JSON.stringify(songs));
      } catch { response.statusCode=500;response.end('{}'); }
    });
  },
}], build: { sourcemap: false, rollupOptions: { output: { manualChunks: { 'firebase-auth': ['firebase/app', 'firebase/auth'], 'firebase-data': ['firebase/firestore'], react: ['react', 'react-dom'] } } } } });
