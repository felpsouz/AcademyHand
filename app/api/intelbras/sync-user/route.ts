import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const DEVICE_IP  = process.env.INTELBRAS_DEVICE_IP  ?? '192.168.0.100';
const DEVICE_USER = process.env.INTELBRAS_DEVICE_USER ?? 'admin';
const DEVICE_PASS = process.env.INTELBRAS_DEVICE_PASS ?? 'imperio@2026';

function md5(str: string) {
  return crypto.createHash('md5').update(str).digest('hex');
}

// Implementa Digest Auth — faz a requisição com autenticação MD5
async function digestFetch(url: string, method: string, body?: string): Promise<Response> {
  const baseUrl = `http://${DEVICE_IP}`;
  const fullUrl = `${baseUrl}${url}`;

  // 1ª requisição — pega o desafio WWW-Authenticate
  const firstRes = await fetch(fullUrl, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body,
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);

  if (!firstRes || firstRes.status !== 401) {
    // Se não veio 401, retorna como está
    return firstRes ?? new Response('Connection failed', { status: 503 });
  }

  const wwwAuth = firstRes.headers.get('www-authenticate') ?? '';
  const realm   = wwwAuth.match(/realm="([^"]+)"/)?.[1] ?? '';
  const nonce   = wwwAuth.match(/nonce="([^"]+)"/)?.[1] ?? '';
  const qop     = wwwAuth.match(/qop="?([^",]+)"?/)?.[1] ?? '';

  const nc     = '00000001';
  const cnonce = crypto.randomBytes(8).toString('hex');
  const uri    = url.split('?')[0] || url;

  const ha1      = md5(`${DEVICE_USER}:${realm}:${DEVICE_PASS}`);
  const ha2      = md5(`${method}:${uri}`);
  const response = qop
    ? md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    : md5(`${ha1}:${nonce}:${ha2}`);

  const authHeader = [
    `Digest username="${DEVICE_USER}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
    qop ? `qop=${qop}` : '',
    qop ? `nc=${nc}` : '',
    qop ? `cnonce="${cnonce}"` : '',
    `response="${response}"`,
  ].filter(Boolean).join(', ');

  return fetch(fullUrl, {
    method,
    headers: {
      Authorization: authHeader,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
    signal: AbortSignal.timeout(8000),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { userId, name, photoBase64 } = await req.json();

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId e name são obrigatórios' }, { status: 400 });
    }

    // 1. Criar usuário no dispositivo
    const userBody = JSON.stringify({
      UserList: [{
        UserID:    userId,
        UserName:  name,
        UserType:  0,
        UserStatus: 0,
        Doors:     [0],
        TimeSections: [255],
        ValidFrom: '2020-01-01 00:00:00',
        ValidTo:   '2037-12-31 23:59:59',
      }],
    });

    const userRes = await digestFetch(
      '/cgi-bin/AccessUser.cgi?action=insertMulti',
      'POST',
      userBody
    );

    const userText = await userRes.text();
    console.log('Intelbras createUser:', userRes.status, userText);

    if (!userRes.ok && userRes.status !== 200) {
      return NextResponse.json(
        { error: 'Erro ao criar usuário no dispositivo', detail: userText },
        { status: 500 }
      );
    }

    // 2. Cadastrar foto facial (se fornecida)
    if (photoBase64) {
      const faceBody = JSON.stringify({
        FaceList: [{
          UserID:    userId,
          PhotoData: [photoBase64],
        }],
      });

      const faceRes = await digestFetch(
        '/cgi-bin/AccessFace.cgi?action=insertMulti',
        'POST',
        faceBody
      );

      const faceText = await faceRes.text();
      console.log('Intelbras addFace:', faceRes.status, faceText);

      if (!faceRes.ok) {
        // Usuário foi criado mas foto falhou — não é erro crítico
        return NextResponse.json({
          success: true,
          warning: 'Usuário criado mas falha ao cadastrar foto',
          detail: faceText,
        });
      }
    }

    return NextResponse.json({ success: true, userId, name });

  } catch (err: any) {
    console.error('Intelbras sync error:', err.message);

    // Erro de rede — provavelmente acessando de fora da rede local
    if (err.cause?.code === 'ECONNREFUSED' || err.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Dispositivo não acessível — acesse o sistema da rede da academia', offline: true },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}