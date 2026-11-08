# Sol do Brasil

App móvel de música brasileira com React, TypeScript e Firebase. A identidade visual usa a imagem fornecida, tons de papel, verde e dourado e fontes hospedadas junto do app.

## Produção

- App no GitHub Pages: https://leojaime20.github.io/Sol_do_Brasil/
- Repositório público: https://github.com/leojaime20/Sol_do_Brasil
- Hospedagem anterior no Firebase: https://sol-do-brasil-musica.web.app
- Projeto: `sol-do-brasil-musica`
- Console: https://console.firebase.google.com/project/sol-do-brasil-musica/overview
- Firestore: banco `(default)`, região `southamerica-east1` (São Paulo).
- Autenticação: Google, com lista explícita de e-mails autorizados.
- Hospedagem principal: GitHub Pages com HTTPS e publicação automática pelo GitHub Actions. O Firebase Hosting anterior continua disponível.

## Experiência

Escolha um ano disponível para sortear uma faixa daquele período, veja título, artista e ano original e abra a faixa no Spotify. Ao voltar a um ano, o app evita repetir a última faixa exibida quando há outras opções. Há também sorteio do catálogo inteiro, busca sem acentos, filtro por década e instruções para jogar em grupo. O manifesto permite abrir como app independente em navegadores compatíveis. O catálogo precisa de conexão; não há modo offline.

O link abre o Spotify, mas **não garante reprodução automática**. Para controlar o playback, é necessário cadastrar um aplicativo no Spotify Developers, usar OAuth PKCE, conceder o escopo `user-modify-playback-state` e ter uma conta Premium/dispositivo disponível. Esta versão usa os links fornecidos e não solicita credenciais Spotify. Referência: https://developer.spotify.com/documentation/web-api/reference/start-a-users-playback

## Liberar ou revogar convidados

Nenhum e-mail é liberado automaticamente. O dono do projeto administra a lista pelo Firestore ou pelo terminal autenticado:

```sh
npx firebase login
npx firebase projects:list
npm run access -- grant pessoa@gmail.com outra@gmail.com
npm run access -- revoke pessoa@gmail.com
```

Os scripts usam a sessão local do Firebase CLI, mantida apenas em memória. Alternativamente, recebem `GOOGLE_OAUTH_ACCESS_TOKEN` do ambiente. Não crie arquivos com tokens nem envie credenciais ao navegador. Os comandos têm o projeto `sol-do-brasil-musica` fixado para evitar alterações em outros projetos.

No console, crie `allowedUsers/<email-em-minúsculas>` com `enabled: true` (booleano). Para revogar, altere para `false`. A tela acompanha alterações do próprio convite em tempo real. As regras exigem Google, e-mail verificado e convite ativo. O navegador não pode escrever no catálogo nem autorizar contas. A lista completa de convidados não é legível por usuários.

## Dados

- `songs/<id-do-csv>`: `id`, `title`, `artist`, `year`, `spotifyUrl`.
- `catalog/summary`: contagem, anos disponíveis, fonte e data de importação.
- `allowedUsers/<email>`: `enabled`, `email`, `updatedAt`.

O arquivo original local está em `data/musicas.csv` e não é enviado ao repositório público nem aos arquivos do Pages. Os 427 registros já foram importados no Firestore, inclusive os IDs não sequenciais, nomes e anos originais. As entradas 400 e 431 apontam para a mesma faixa de “Leão”, com anos 2020 e 2022; nenhuma correção foi inventada.

```sh
npm run catalog:validate
npm run catalog:import
```

A importação valida IDs, campos obrigatórios, anos e URLs Spotify. É um upsert por ID: reexecutar não duplica músicas. Ela **não apaga** registros removidos de versões futuras do CSV; exclusões devem ser revisadas à parte. O CSV não é publicado em `dist/` e o catálogo não está embutido no JavaScript de produção.

## Desenvolvimento e verificações

Use Node.js 22 ou 24 LTS:

```sh
npm ci
npm run dev
npm test
npm run test:rules
npm run build
```

`http://127.0.0.1:5173/?demo` oferece uma prévia local do catálogo sem login para revisar o layout. Essa opção só existe em desenvolvimento (`import.meta.env.DEV`); a rota que lê o CSV também existe apenas no servidor Vite. O servidor está limitado ao loopback. Em produção, `?demo` não libera acesso.

Os testes de regras usam a API oficial Firebase Rules com contextos simulados; não criam usuários nem permissões reais. Cobrem acesso público, convidado ativo/inativo, e-mail não verificado, outro provedor, escrita indevida e privacidade dos convites. Os testes do catálogo cobrem integridade, busca, anos, sorteio e URLs.

`src/firebase-config.json` contém apenas a configuração pública do SDK web. A autorização depende das regras, não de esconder a API key. O arquivo `firebase.json` local mantém o e-mail de suporte da configuração Google; ele é ignorado pelo Git. O repositório inclui `firebase.example.json` sem esse dado: para configurar outro checkout, copie-o para `firebase.json` e substitua `SEU_EMAIL_DE_SUPORTE` pelo e-mail da conta administradora. Login real em desenvolvimento exige acrescentar `localhost`/`127.0.0.1` aos domínios autorizados; por padrão só os domínios de produção estão autorizados.

## Publicar

```sh
npm run deploy
```

O GitHub Pages publica automaticamente a cada envio para a branch `main`. Use `npm run build:pages` para gerar os arquivos do Pages localmente. O comando `npm run deploy` acima mantém a hospedagem Firebase anterior e as regras do Firestore. O projeto Firebase foi criado sem vincular faturamento. Não é necessário Cloud Functions para o fluxo atual. Limites de uso do Firebase e a disponibilidade das faixas Spotify continuam aplicáveis.
