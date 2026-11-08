# Verificação — 08/11/2026

- Build TypeScript/Vite concluído e versão publicada em https://sol-do-brasil-musica.web.app.
- HTML remoto comparado ao `dist/index.html`: idêntico.
- 427 registros no Firestore comparados campo a campo ao CSV: zero diferenças.
- Acesso Google controlado por documentos `allowedUsers` no Firestore. A lista pode mudar após esta verificação.
- Google OAuth habilitado com client ID próprio; iniciação via `accounts:createAuthUri` retornou HTTP 200 e URL de autorização Google.
- Domínios autorizados: `sol-do-brasil-musica.web.app` e `sol-do-brasil-musica.firebaseapp.com`.
- Leitura de música sem autenticação no Firestore: HTTP 403.
- 6 testes do catálogo aprovados.
- 10 casos de regras aprovados pela API oficial Firebase Rules (contextos simulados).
- Revisão visual em 320 px, 390 px e 1280 px; sem overflow horizontal na largura de 320 px.
- Navegação local: ano com uma faixa desabilita sorteio; ano mínimo desabilita anterior; busca sem acentos encontra duas entradas de Leão; seleção da versão de 2022 aponta para o link correto.
- Produção sem CSV, faixas embutidas ou rota de catálogo de desenvolvimento; `?demo` não habilita o acervo em produção.
- Auditoria de dependências de produção: zero vulnerabilidades conhecidas no momento da verificação. Dependências de ferramentas de desenvolvimento ainda reportam avisos moderados.
- Publicação GitHub Pages configurada em `https://leojaime20.github.io/Sol_do_Brasil/` com GitHub Actions no branch `main`; o HTML respondeu HTTP 200.
- O CSV original e o arquivo local de configuração administrativa Firebase estão excluídos do repositório público. A build publicada usa somente `dist/`.

## Limites da verificação

O login completo e a leitura com uma conta Google real dependem da lista de usuários a ser fornecida. A autorização foi testada com contextos simulados e com a rejeição real de leitura anônima. Abrir o link Spotify está implementado; reprodução automática não está implementada e depende de integração OAuth Spotify/Premium.
