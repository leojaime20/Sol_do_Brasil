import { googleApi, documentsUrl } from './google-api.mjs';
const [action, ...emails] = process.argv.slice(2);
if (!['grant', 'revoke'].includes(action) || !emails.length) {
  console.error('Uso: npm run access -- grant pessoa@gmail.com [outra@gmail.com]\n     npm run access -- revoke pessoa@gmail.com');
  process.exit(1);
}
for (const original of emails) {
  const email = original.trim().toLowerCase();
  if (!/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(email)) throw new Error(`E-mail inválido: ${original}`);
  await googleApi(`${documentsUrl}/allowedUsers/${encodeURIComponent(email)}`, {method:'PATCH',body:JSON.stringify({fields:{
    enabled:{booleanValue:action === 'grant'}, email:{stringValue:email}, updatedAt:{timestampValue:new Date().toISOString()},
  }})});
  console.log(`${action === 'grant' ? 'Liberado' : 'Revogado'}: ${email}`);
}
