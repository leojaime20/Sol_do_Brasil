// Credentials stay in memory. Never include OAuth tokens in logs or generated files.
import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
export const projectId = 'sol-do-brasil-musica';
export async function accessToken() {
  if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  const cli = JSON.parse(await readFile(join(homedir(), '.config/configstore/firebase-tools.json'), 'utf8'));
  if (!cli.tokens?.access_token || cli.tokens.expires_at < Date.now() + 30000) {
    throw new Error('Sessão do Firebase expirada. Execute firebase projects:list e tente novamente.');
  }
  return cli.tokens.access_token;
}
export async function googleApi(path, options = {}) {
  const token = await accessToken();
  const response = await fetch(path, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${result.error?.message || 'Falha na API Google'}`);
  return result;
}
export const documentsUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
