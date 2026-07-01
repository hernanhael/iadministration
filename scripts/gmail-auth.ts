/**
 * Obtiene un refresh_token de Gmail (scope readonly) para el cron de
 * importación automática de facturas (src/app/api/cron/gmail-facturas).
 *
 * Requiere un OAuth Client tipo "Desktop app" en Google Cloud, con la Gmail
 * API habilitada y el usuario agregado como test user (pantalla de
 * consentimiento en modo Testing).
 *
 * Uso:
 *   1. Completar GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET en .env.local
 *   2. npx tsx scripts/gmail-auth.ts
 *   3. Abrir la URL que imprime, aceptar con la cuenta de Gmail, y pegar en
 *      esta terminal el valor de "code" que queda en la URL de redirección
 *      (el navegador va a mostrar un error de conexión porque no hay servidor
 *      escuchando en localhost — es esperado, el code igual está en la barra
 *      de direcciones).
 *   4. Copiar el refresh_token impreso a GMAIL_REFRESH_TOKEN en .env.local y
 *      luego en las variables de entorno de Vercel.
 */

import { createInterface } from 'node:readline/promises';
import { google } from 'googleapis';

const CLIENT_ID = process.env.GMAIL_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Faltan GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET en .env.local');
  process.exit(1);
}

async function main() {
  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, 'http://localhost');

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // fuerza a Google a reemitir refresh_token
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  });

  console.log('\n1) Abrí esta URL, iniciá sesión con tu cuenta de Gmail y aceptá:\n');
  console.log(url);
  console.log('\n2) El navegador va a fallar al redirigir a localhost — está bien.');
  console.log('   Copiá el valor de "code" que aparece en esa URL de la barra de direcciones.\n');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const code = (await rl.question('Pegá el code acá: ')).trim();
  rl.close();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    console.error(
      '\nGoogle no devolvió un refresh_token. Probablemente ya diste consentimiento antes sin `prompt=consent`.',
    );
    console.error(
      'Revocá el acceso en https://myaccount.google.com/permissions y volvé a correr este script.',
    );
    process.exit(1);
  }

  console.log('\nListo. Guardá este valor como GMAIL_REFRESH_TOKEN en .env.local y en Vercel:\n');
  console.log(tokens.refresh_token);
  console.log('');
}

main().catch((e) => {
  console.error('Error al obtener el refresh_token:', e instanceof Error ? e.message : e);
  process.exit(1);
});
