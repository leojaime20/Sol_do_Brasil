import { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import { ArrowDown, ArrowRight, Check, ChevronLeft, ChevronRight, Disc3, Headphones, Library, LoaderCircle, LogOut, Music2, Search, ShieldCheck, Shuffle, Sun, X } from 'lucide-react';
import { auth, db, signIn } from './firebase';
import { filterSongs, randomSong, songsForCatalog, validSong, type Catalog, type Song } from './catalog';
import internationalCatalog from './international-catalog.json';

type View = 'play' | 'library' | 'help';
type Session = 'loading' | 'signed-out' | 'pending' | 'approved' | 'error';
const isDemo = import.meta.env.DEV && new URLSearchParams(location.search).has('demo');
const internationalSongs = (internationalCatalog as Song[]).filter(validSong);
const catalogDetails: Record<Catalog, { title: string; description: string }> = {
  brazilian: { title: 'Brasileiras', description: 'O acervo original, de 1960 a 2026.' },
  international: { title: 'Internacionais', description: 'Cinco destaques por ano de ranking, de 1960 a 2026.' },
  mix: { title: 'Mix', description: 'Todos os sons brasileiros e internacionais juntos.' },
};

function Spotify({ size = 22 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1.03.25c-2.82-1.72-6.37-2.11-10.54-1.16a.75.75 0 1 1-.33-1.46c4.56-1.04 8.49-.59 11.65 1.34a.75.75 0 0 1 .25 1.03Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.23-1.99-8.16-2.57-11.98-1.41a.94.94 0 1 1-.55-1.8c4.36-1.32 9.8-.68 13.51 1.61a.94.94 0 0 1 .31 1.29Zm.13-3.4C15.23 8.33 8.83 8.12 5.1 9.25a1.13 1.13 0 0 1-.65-2.16c4.28-1.3 11.35-1.05 15.8 1.59a1.13 1.13 0 1 1-1.15 1.94Z"/></svg>;
}
function Brand() {
  return <div className="brand"><span className="brand-sun"><Sun size={30} strokeWidth={1.7}/></span><span>SOL <small>DO</small> BRASIL<span className="brand-caption">A NOSSA HISTÓRIA DÁ PLAY</span></span></div>;
}
function Google() {
  return <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.36Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.96c1.47 0 2.79.5 3.83 1.5l2.88-2.88A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"/></svg>;
}
function Footer() { return <footer><span>Feito de música. Feito de Brasil.</span><span><Sun size={14}/> Desde o primeiro acorde.</span></footer>; }

export default function App() {
  const [session, setSession] = useState<Session>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [brazilianSongs, setBrazilianSongs] = useState<Song[]>([]);
  const [catalog, setCatalog] = useState<Catalog>('brazilian');
  const [catalogChosen, setCatalogChosen] = useState(false);
  const [loadingSongs, setLoadingSongs] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<View>('play');
  const [year, setYear] = useState(2000);
  const [selected, setSelected] = useState<Song>();
  const lastSelectedIdByYear = useRef(new Map<number, string>());
  const [search, setSearch] = useState('');
  const [decade, setDecade] = useState<number | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (isDemo) {
      fetch('/__dev/catalog').then(r => r.json()).then((items: Song[]) => {
        setBrazilianSongs(items.filter(validSong)); setSession('approved'); setLoadingSongs(false);
      }).catch(() => { setError('Não foi possível carregar a prévia.'); setSession('error'); });
      return;
    }
    let stopAccess: (() => void) | undefined;
    const stopAuth = onAuthStateChanged(auth, current => {
      stopAccess?.(); setUser(current); setBrazilianSongs([]); setSelected(undefined); setError('');
      if (!current) { setSession('signed-out'); return; }
      if (!current.email || !current.emailVerified) { setSession('pending'); return; }
      setSession('loading');
      stopAccess = onSnapshot(doc(db, 'allowedUsers', current.email.toLowerCase()), snapshot => {
        setSession(snapshot.exists() && snapshot.data().enabled === true ? 'approved' : 'pending');
      }, () => { setSession('error'); setError('Não foi possível verificar seu acesso. Confira a conexão e tente novamente.'); });
    });
    return () => { stopAuth(); stopAccess?.(); };
  }, []);

  useEffect(() => {
    if (session !== 'approved') { setBrazilianSongs([]); setSelected(undefined); return; }
    if (isDemo) return;
    setLoadingSongs(true);
    return onSnapshot(query(collection(db, 'songs'), orderBy('year')), snapshot => {
      const items = snapshot.docs.map(song => ({ ...song.data(), id: song.id })).filter(validSong);
      setBrazilianSongs(items); setLoadingSongs(false); setError('');
    }, () => { setBrazilianSongs([]); setSelected(undefined); setLoadingSongs(false); setError('Não foi possível abrir o acervo brasileiro. Verifique sua conexão ou seu acesso.'); });
  }, [session]);

  const songs = useMemo(() => songsForCatalog(brazilianSongs, internationalSongs, catalog), [brazilianSongs, catalog]);
  const years = useMemo(() => [...new Set(songs.map(song => song.year))].sort((a,b) => a-b), [songs]);
  const yearSongs = useMemo(() => filterSongs(songs, '', year), [songs, year]);
  const results = useMemo(() => filterSongs(songs, search).filter(song => decade === null || Math.floor(song.year / 10) * 10 === decade), [songs, search, decade]);
  useEffect(() => {
    if (!songs.length) return;
    if (!years.includes(year)) { setYear(years[0]); return; }
    setSelected(previous => yearSongs.find(song => song.id === previous?.id)
      ?? randomSong(yearSongs, lastSelectedIdByYear.current.get(year)));
  }, [songs, yearSongs, year, years]);
  useEffect(() => {
    if (selected) lastSelectedIdByYear.current.set(selected.year, selected.id);
  }, [selected]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(timer); }, [notice]);

  async function login() {
    setBusy(true); setError('');
    try { await signIn(); } catch (e) {
      if ((e as {code?: string}).code === 'auth/popup-blocked') setError('O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente novamente.');
      else if ((e as {code?: string}).code !== 'auth/popup-closed-by-user') setError('Não foi possível entrar com o Google. Tente novamente no navegador.');
    } finally { setBusy(false); }
  }
  async function logout() {
    try { await signOut(auth); setView('play'); setCatalogChosen(false); setCatalog('brazilian'); } catch { setNotice('Não foi possível sair. Tente novamente.'); }
  }
  function chooseCatalog(next: Catalog) {
    setCatalog(next); setCatalogChosen(true); setSearch(''); setDecade(null); setView('play');
    lastSelectedIdByYear.current.clear();
  }
  function choose(song: Song) { setYear(song.year); setSelected(song); setView('play'); window.scrollTo({top:0,behavior:'smooth'}); }
  function selectYear(nextYear: number) {
    const next = randomSong(filterSongs(songs, '', nextYear), lastSelectedIdByYear.current.get(nextYear));
    if (!next) return;
    lastSelectedIdByYear.current.set(nextYear, next.id);
    setYear(nextYear);
    setSelected(next);
  }
  function shuffle(all = false) {
    const next = randomSong(all ? songs : yearSongs, selected?.id);
    if (next) { setYear(next.year); setSelected(next); setView('play'); }
  }

  if (session !== 'approved') return <div className="entry-page">
    <header className="entry-header"><Brand/><span className="private-badge"><ShieldCheck size={15}/> ACESSO POR CONVITE</span></header>
    <main className="entry-main">
      <div className="entry-copy">
        <span className="eyebrow"><span/> UMA VIAGEM PELA MÚSICA</span>
        <h1>Tem música que<br/>faz o tempo<br/><em>voltar.</em><Sun className="title-sun" strokeWidth={1.2}/></h1>
        <p className="entry-description">Escolha um ano. Reconheça um clássico.<br/>Dê o play nas histórias que a gente viveu.</p>
        {session === 'loading' ? <div className="auth-card loading" role="status"><LoaderCircle className="spin"/> Preparando o seu lugar na roda…</div> :
        session === 'pending' ? <div className="auth-card"><span className="card-label"><ShieldCheck size={18}/> FALTA SÓ O CONVITE</span><h2>Você está quase na roda.</h2><p>A conta <strong>{user?.email}</strong> ainda não tem acesso. Peça ao organizador para liberar seu e-mail.</p><p className="small-copy">Esta página atualiza assim que o convite for liberado.</p><button className="secondary full" onClick={logout}>Usar outra conta Google <ArrowRight size={18}/></button></div> :
        <div className="auth-card"><span className="card-label">A RODA ESTÁ FORMADA</span><h2>Entre e deixe o som levar.</h2><p>Um acervo de encontros, lembranças e muita música boa. Exclusivo para convidados.</p><button className="google-button" onClick={session === 'error' && user ? () => location.reload() : login} disabled={busy}>{busy ? <LoaderCircle className="spin" size={20}/> : <Google/>}{session === 'error' && user ? 'Tentar novamente' : 'Entrar com Google'}<ArrowRight size={19}/></button>{user && session === 'error' && <button className="text-button" onClick={logout}>Usar outra conta</button>}<span className="login-note"><ShieldCheck size={14}/> Apenas contas autorizadas podem entrar.</span></div>}
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="entry-steps"><span><b>01</b> Escolha o ano</span><i/><span><b>02</b> Encontre o som</span><i/><span><b>03</b> Abra no Spotify</span></div>
      </div>
      <div className="entry-art"><div className="art-caption"><span>DO VINIL AO STREAMING</span><span>♪</span></div><img src={`${import.meta.env.BASE_URL}sol-do-brasil.jpg`} alt="Arte Sol do Brasil: sol dourado, instrumentos e folhagens brasileiras em um cartaz vintage"/><span className="art-stamp">3<small>CATÁLOGOS</small></span><div className="art-bottom"><span>RITMOS QUE ATRAVESSAM GERAÇÕES</span><span>1960 — 2026</span></div></div>
    </main><Footer/>
  </div>;

  if (!catalogChosen) return <div className="entry-page catalog-entry">
    <header className="entry-header"><Brand/><span className="private-badge"><Disc3 size={16}/> ESCOLHA SEU ACERVO</span></header>
    <main className="catalog-entry-main">
      <span className="eyebrow"><span/> UMA VIAGEM PELA MÚSICA</span>
      <h1>Qual som vamos <em>reviver?</em></h1>
      <p>Escolha o catálogo para começar. Você pode trocar de seleção a qualquer momento.</p>
      <div className="catalog-options" role="radiogroup" aria-label="Catálogo musical">
        {(Object.keys(catalogDetails) as Catalog[]).map(option => <button key={option} role="radio" aria-checked={catalog === option} className={`catalog-option ${catalog === option ? 'active' : ''}`} onClick={() => setCatalog(option)}><span className="catalog-option-icon">{option === 'mix' ? <Shuffle size={22}/> : option === 'international' ? <Music2 size={22}/> : <Sun size={22}/>}</span><span><strong>{catalogDetails[option].title}</strong><small>{catalogDetails[option].description}</small></span><span className="catalog-radio">{catalog === option && <Check size={14}/>}</span></button>)}
      </div>
      <button className="primary catalog-start" onClick={() => chooseCatalog(catalog)}>Entrar no catálogo <ArrowRight size={18}/></button>
    </main><Footer/>
  </div>;

  return <div className="app-page">
    <header className="app-header"><Brand/><div className="header-right"><button className="catalog-switch" onClick={() => setCatalogChosen(false)}><Disc3 size={16}/> {catalogDetails[catalog].title} <ChevronRight size={14}/></button><span className="member-badge"><span/> {isDemo ? 'PRÉVIA LOCAL' : 'VOCÊ ESTÁ NA RODA'}</span>{!isDemo && <button className="avatar" title={`Sair de ${user?.email}`} aria-label="Sair da conta" onClick={logout}>{user?.photoURL ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer"/> : <LogOut size={18}/>}</button>}</div></header>
    <main className="app-main">
      <div className="page-heading"><div><span className="eyebrow">{catalogDetails[catalog].title.toUpperCase()} · A TRILHA SONORA DAS SUAS MEMÓRIAS</span><h1>{view === 'library' ? <>Todos os sons.<br className="mobile-break"/> <em>Em um acervo.</em></> : view === 'help' ? <>Junte a roda.<br className="mobile-break"/> <em>Solte o som.</em></> : <>Que ano vamos<br className="mobile-break"/> <em>reviver?</em></>}</h1></div><span className="collection-stamp"><Disc3 size={24}/><b>{songs.length}</b><small>MÚSICAS NO ACERVO</small></span></div>
      <nav className="tabs" aria-label="Navegação principal"><button className={view === 'play' ? 'active' : ''} onClick={() => setView('play')}><Headphones size={18}/> Escolher um ano</button><button className={view === 'library' ? 'active' : ''} onClick={() => setView('library')}><Library size={18}/> Acervo</button><button className={view === 'help' ? 'active' : ''} onClick={() => setView('help')}><Music2 size={18}/> Como jogar</button></nav>
      {error && catalog !== 'international' && <div className="error-message" role="alert">{error}<button onClick={() => location.reload()}>Tentar novamente</button></div>}
      {loadingSongs && catalog !== 'international' ? <div className="empty-state" role="status"><LoaderCircle className="spin"/><h2>Afinando os instrumentos…</h2><p>Seu acervo está chegando.</p></div> : !songs.length && !error ? <div className="empty-state"><Disc3/><h2>A seleção está a caminho.</h2><p>O organizador ainda está preparando o acervo.</p></div> : view === 'play' ? <>
        <section className="year-picker" aria-label="Selecionar ano"><div className="year-label"><span className="step-number">01</span><div><h2>Escolha o ano</h2><p>Cada época tem o seu som.</p></div></div><div className="year-controls"><button className="round-button" aria-label="Ano anterior disponível" onClick={() => selectYear(years[years.indexOf(year)-1])} disabled={years.indexOf(year) <= 0}><ChevronLeft/></button><div className="year-select"><label htmlFor="year">{catalog === 'brazilian' ? 'ANO DO LANÇAMENTO' : 'ANO DA SELEÇÃO'}</label><select id="year" value={year} onChange={event => selectYear(Number(event.target.value))}>{years.map(item => <option key={item} value={item}>{item}</option>)}</select><ArrowDown size={16}/></div><button className="round-button" aria-label="Próximo ano disponível" onClick={() => selectYear(years[years.indexOf(year)+1])} disabled={years.indexOf(year) === years.length-1}><ChevronRight/></button></div><button className="surprise-button" onClick={() => shuffle(true)}><Shuffle size={17}/> Me surpreenda</button></section>
        {selected && <section className="now-card" aria-label="Música selecionada"><div className="record-art"><div className="art-lines"/><span className="record-top">SOL DO BRASIL • SELEÇÃO MUSICAL</span><div className="sun-record"><div className="sun-record-core"><Music2 size={24}/><strong>{selected.year}</strong><span>{selected.origin === 'international' ? 'ANO DA SELEÇÃO' : 'ANO DO LANÇAMENTO'}</span></div></div><span className="record-bottom">UM ANO. MIL MEMÓRIAS.</span><span className="art-note one">♪</span><span className="art-note two">♫</span></div><div className="now-copy"><span className="card-label"><span className="green-dot"/> O SOM DA VEZ</span><h2>{selected.title}</h2><p className="artist">{selected.artist}</p><div className="track-meta"><span>{selected.year}</span><span>MÚSICA {selected.origin === 'international' ? 'INTERNACIONAL' : 'BRASILEIRA'}</span></div><a className="spotify-button" href={selected.spotifyUrl} target="_blank" rel="noopener noreferrer" onClick={() => setNotice(selected.origin === 'international' ? 'A busca foi aberta no Spotify. Escolha a gravação desejada por lá.' : 'A faixa foi aberta no Spotify. Toque em reproduzir por lá.')}><Spotify/> {selected.origin === 'international' ? 'Buscar no Spotify' : 'Abrir no Spotify'} <ArrowRight size={19}/></a><button className="another-button" onClick={() => shuffle()} disabled={yearSongs.length < 2}><Shuffle size={17}/> Outra música de {year}</button>{selected.sourceUrl && <a className="source-link" href={selected.sourceUrl} target="_blank" rel="noopener noreferrer">Fonte da seleção: {selected.sourceUrl.includes('officialcharts') ? 'Official Charts' : 'Top40Charts.net'} ↗</a>}<p className="playback-note">{selected.origin === 'international' ? 'Escolha a versão da música nos resultados do Spotify.' : 'Abre a faixa no app ou no site do Spotify.'}</p></div></section>}
        <section className="year-tracks"><div className="section-heading"><div><span className="step-number">02</span><h2>Mais sons de {year}</h2></div><span>{yearSongs.length} {yearSongs.length === 1 ? 'música' : 'músicas'}</span></div><div className="song-list">{yearSongs.map((song,index) => <button key={song.id} className={`song-row ${selected?.id === song.id ? 'selected' : ''}`} onClick={() => setSelected(song)} aria-pressed={selected?.id === song.id}><span className="track-number">{selected?.id === song.id ? <span className="equalizer"><i/><i/><i/></span> : String(index+1).padStart(2,'0')}</span><span className="song-info"><b>{song.title}</b><span>{song.artist}{catalog === 'mix' && <em className="song-origin"> · {song.origin === 'international' ? 'Internacional' : 'Brasileira'}</em>}</span></span><span className="row-year">{song.year}</span><span className="track-action">{selected?.id === song.id ? <Check size={17}/> : <ArrowRight size={17}/>}</span></button>)}</div></section>
        <div className="bottom-note"><Sun size={20}/><p>Não é só uma música. <strong>É uma época inteira.</strong></p><span>♪</span></div>
      </> : view === 'library' ? <section className="library-section"><label className="search-input"><Search size={20}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Busque uma música, artista ou ano" aria-label="Buscar música, artista ou ano"/>{search && <button onClick={() => setSearch('')} aria-label="Limpar busca"><X size={18}/></button>}</label><div className="decades" aria-label="Filtrar por década"><button onClick={() => setDecade(null)} className={decade === null ? 'active' : ''}>Todas as épocas</button>{[...new Set(years.map(y => Math.floor(y/10)*10))].map(item => <button key={item} className={decade === item ? 'active' : ''} onClick={() => setDecade(item)}>Anos {String(item).slice(-2)}</button>)}</div><div className="section-heading"><h2>Nosso acervo</h2><span>{results.length} {results.length === 1 ? 'música encontrada' : 'músicas encontradas'}</span></div>{results.length ? <div className="song-list">{results.map(song => <button className="song-row" key={song.id} onClick={() => choose(song)}><span className="library-disc"><Disc3 size={22}/></span><span className="song-info"><b>{song.title}</b><span>{song.artist}{catalog === 'mix' && <em className="song-origin"> · {song.origin === 'international' ? 'Internacional' : 'Brasileira'}</em>}</span></span><span className="row-year">{song.year}</span><ArrowRight size={17}/></button>)}</div> : <div className="empty-state"><Search/><h2>Esse som ainda não apareceu.</h2><p>Tente outro nome, artista ou ano.</p><button className="secondary" onClick={() => {setSearch('');setDecade(null);}}>Limpar filtros</button></div>}</section> : <section className="help-section">
        <p className="help-intro">Escute, coloque cada música no tempo e marque seus pontos.</p>
        {[
          {n:'01', title:'Comece sua linha do tempo', body:'Cada jogador recebe uma carta inicial e deixa o ano visível. Essa carta abre sua linha do tempo, mas não vale pontos.'},
          {n:'02', title:'Pegue uma carta e solte o som', body:'Na sua vez, pegue uma nova carta sem olhar o ano. Outro jogador vê a carta, seleciona o ano no app e abre uma música daquele ano no Spotify, sem mostrar a carta nem a tela para você.'},
          {n:'03', title:'Posicione e dê seus palpites', body:'Depois de ouvir, indique onde a nova carta entra na sua linha do tempo, do ano mais antigo ao mais recente. Diga também, se souber, o artista e o nome da música. Defina as três respostas antes de revelarem a carta ou a tela.'},
          {n:'04', title:'Revele e marque os pontos', body:'Confira o ano, o artista e a música. Se a posição estiver certa, ganhe a carta e acrescente-a à sua linha do tempo. Marque os acertos com peças físicas: artista e música valem pontos mesmo se você errar a posição.'},
          {n:'05', title:'Encerre a partida', body:'Joguem o mesmo número de turnos. Vence quem somar mais pontos; em caso de empate, vence quem tiver mais cartas na linha do tempo.'},
        ].map(step => <article key={step.n}><span className="step-number">{step.n}</span><div><h2>{step.title}</h2><p>{step.body}</p></div></article>)}
        <div className="score-card" aria-label="Pontuação por acerto">
          <h2>Pontuação de cada turno</h2>
          <div className="score-items"><div><strong>4</strong><span>Posição certa</span></div><div><strong>1</strong><span>Artista certo</span></div><div><strong>1</strong><span>Música certa</span></div></div>
          <p>Os três acertos são independentes. Use peças físicas para registrar os pontos.</p>
        </div>
        <div className="help-callout"><Spotify/><p>Você usa sua própria conta no Spotify. A disponibilidade das faixas e a reprodução dependem do serviço e do seu plano.</p></div>
        <button className="primary" onClick={() => setView('play')}>Vamos escolher um som <ArrowRight size={18}/></button>
      </section>}
    </main><Footer/>{notice && <div className="toast" role="status"><Check size={18}/>{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={18}/></button></div>}
  </div>;
}
