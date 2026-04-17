import { NextRequest, NextResponse } from 'next/server';

const DEVICE_IP   = process.env.DEVICE_IP   || '192.168.0.100';
const DEVICE_PORT = process.env.DEVICE_PORT  || '9020';
const DEVICE_USER = process.env.DEVICE_USER  || 'admin';
const DEVICE_PASS = process.env.DEVICE_PASS  || 'imperio@2026';

const authHeader = 'Basic ' + Buffer.from(`${DEVICE_USER}:${DEVICE_PASS}`).toString('base64');
const baseUrl    = `http://${DEVICE_IP}:${DEVICE_PORT}`;

/** fetch com timeout para não travar indefinidamente */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function cadastrarUsuario(userId: string, name: string): Promise<{ ok: boolean; detail: string }> {
  const params = new URLSearchParams({
    action:         'insert',
    UserID:         userId,
    UserName:       name,
    UserType:       '0',
    Authority:      '2',
    ValidDateStart: '1970-01-01 00:00:00',
    ValidDateEnd:   '2037-12-31 23:59:59',
  });

  const url = `${baseUrl}/cgi-bin/AccessUser.cgi?${params.toString()}`;
  console.log('[sync-user] Cadastrando usuário →', url);

  const res  = await fetchWithTimeout(url, {
    method:  'GET',
    headers: { Authorization: authHeader },
  });

  const text = await res.text();
  console.log('[sync-user] Resposta cadastro usuário:', res.status, text);

  return { ok: res.ok, detail: text };
}

async function cadastrarFace(
  userId: string,
  imageBuffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<{ ok: boolean; detail: string }> {
  const boundary = '----IntelbrasFormBoundary' + Date.now().toString(16);

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="UserID"\r\n\r\n${userId}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="Image"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
    imageBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);

  const url = `${baseUrl}/cgi-bin/AccessFace.cgi?action=insertMulti`;
  console.log('[sync-user] Enviando face →', url);

  const res  = await fetchWithTimeout(url, {
    method:  'POST',
    headers: {
      Authorization:  authHeader,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  const text = await res.text();
  console.log('[sync-user] Resposta cadastro face:', res.status, text);

  return { ok: res.ok, detail: text };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const userId   = formData.get('userId') as string | null;
    const name     = formData.get('name')   as string | null;
    const photo    = formData.get('photo')  as File   | null;

    console.log('[sync-user] Recebido — userId:', userId, '| name:', name, '| photo:', photo?.name ?? 'nenhuma');

    if (!userId || !name) {
      return NextResponse.json({ ok: false, error: 'userId e name são obrigatórios' }, { status: 400 });
    }

    // 1. Cadastra o usuário no dispositivo
    const { ok: userOk, detail: userDetail } = await cadastrarUsuario(userId, name);

    if (!userOk) {
      return NextResponse.json({
        ok: false,
        error: 'Falha ao cadastrar usuário no dispositivo',
        detail: userDetail,
      }, { status: 500 });
    }

    // 2. Cadastra a face se houver foto
    if (photo) {
      const imageBuffer = Buffer.from(await photo.arrayBuffer());
      const { ok: faceOk, detail: faceDetail } = await cadastrarFace(userId, imageBuffer, photo.type, photo.name);

      if (!faceOk) {
        return NextResponse.json({
          ok: false,
          error: 'Usuário cadastrado, mas falha ao enviar foto. Cadastre manualmente no dispositivo.',
          detail: faceDetail,
        }, { status: 207 });
      }
    }

    return NextResponse.json({ ok: true, message: 'Usuário e foto cadastrados no dispositivo com sucesso!' });

  } catch (err: any) {
    // Identifica causa raiz do erro
    const isTimeout  = err.name === 'AbortError';
    const isNetwork  = err.cause?.code === 'ECONNREFUSED' || err.cause?.code === 'ENOTFOUND';

    console.error('[sync-user] ERRO:', {
      name:    err.name,
      message: err.message,
      cause:   err.cause,
    });

    const errorMsg = isTimeout
      ? `Dispositivo não respondeu em 8s — verifique se ${DEVICE_IP}:${DEVICE_PORT} está acessível`
      : isNetwork
        ? `Não foi possível conectar ao dispositivo em ${DEVICE_IP}:${DEVICE_PORT} — verifique o IP/porta`
        : err.message;

    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}