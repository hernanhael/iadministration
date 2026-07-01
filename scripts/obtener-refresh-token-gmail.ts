/**
 * Setup único: obtiene el GMAIL_REFRESH_TOKEN para el cron de facturas por
 * email (src/app/api/cron/facturas-gmail).
 *
 * Requisitos previos (manuales, en Google Cloud Console):
 *  1. Crear/seleccionar un proyecto y habilitar la Gmail API.
 *  2. Pantalla de consentimiento OAuth: tipo External, agregar
 *     hernanhael@gmail.com como usuario, y dejar "Publishing status" en
 *     "In production" (en "Testing" el refresh token expira a los 7 días).
 *  3. Crear una credencial OAuth Client ID de tipo "Desktop app" →
 *     client_id / client_secret.
 *
 * Ejecutar con:
 *   GMAIL_CLIENT_ID=... GMAIL_CLIENT_SECRET=... npx tsx scripts/obtener-refresh-token-gmail.ts
 *
 * Abre una URL para autorizar con hernanhael@gmail.com; al aceptar, imprime
 * GMAIL_REFRESH_TOKEN para pegar en .env.local y en las variables de entorno
 * de Vercel. Se corre una sola vez; no forma parte del build de la app.
 */

import { google } from 'googleapis'
import http from 'node:http'

const CLIENT_ID = process.env.GMAIL_CLIENT_ID!
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET!
const PUERTO = 53682
const REDIRECT_URI = `http://localhost:${PUERTO}`

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Faltan GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET en el entorno.')
  process.exit(1)
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const url = oauth2.generateAuthUrl({
  access_type: 'offline',
  // Fuerza a que Google reemita el refresh_token aunque ya se haya autorizado antes.
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/gmail.readonly'],
})

console.log('\nAbrí esta URL, iniciá sesión con hernanhael@gmail.com y aceptá:\n')
console.log(url, '\n')

const server = http.createServer(async (req, res) => {
  try {
    const code = new URL(req.url ?? '', REDIRECT_URI).searchParams.get('code')
    if (!code) {
      res.end('Falta el parámetro "code" en la URL de redirección.')
      return
    }
    const { tokens } = await oauth2.getToken(code)
    if (!tokens.refresh_token) {
      res.end('Google no devolvió un refresh_token. Revocá el acceso previo en https://myaccount.google.com/permissions y volvé a intentar.')
      console.error('\nNo se recibió refresh_token. Revocá el acceso de la app en https://myaccount.google.com/permissions y corré el script de nuevo.')
      server.close()
      return
    }
    res.end('Listo, podés cerrar esta pestaña.')
    console.log('\nGMAIL_REFRESH_TOKEN=' + tokens.refresh_token + '\n')
    server.close()
  } catch (e) {
    res.end('Error al canjear el código. Revisá la consola.')
    console.error(e)
    server.close()
  }
})

server.listen(PUERTO)
