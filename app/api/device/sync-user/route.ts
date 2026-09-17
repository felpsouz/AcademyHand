import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { adminDb } from '@/lib/firebase-admin';

// Configuração do leitor facial de UMA academia.
// Cada academia tem seu próprio dispositivo (IP, usuário e senha diferentes),
// então isso vem do Firestore em academies/{academyId}.device.
interface DeviceConfig {
  ip: string;
  port: string;
  user: string;
  pass: string;
}

// Fallback para o .env — mantém funcionando a academia que já estava
// configurada antes do sistema virar multi-academia.
const FALLBACK_DEVICE: DeviceConfig = {
  ip:   process.env.DEVICE_IP   || '192.168.2.100',
  port: process.env.DEVICE_PORT || '9020',
  user: process.env.DEVICE_USER || 'admin',
  pass: process.env.DEVICE_PASS || '',
};

async function getDeviceConfig(academyId: string): Promise<DeviceConfig | null> {
  const academyDoc = await adminDb().collection('academies').doc(academyId).get();
  if (!academyDoc.exists) return null;

  const data = academyDoc.data()!;

  // Compatibilidade: academias criadas antes dessa flag existir não têm o
  // campo usaFacial (undefined) — tratamos isso como "tem sim", já que é
  // o comportamento que elas sempre tiveram. Só desativa quando o master
  // explicitamente desmarcou o checkbox ao criar a academia (false).
  if (data.usaFacial === false) return null;

  const device = data.device;

  if (device?.ip) {
    return {
      ip:   device.ip,
      port: device.port ?? '9020',
      user: device.user ?? 'admin',
      pass: device.pass ?? '',
    };
  }

  // Marcada como usaFacial mas sem config própria → usa a do .env
  // (mantém funcionando a academia original, de antes do multi-tenant)
  return FALLBACK_DEVICE.pass ? FALLBACK_DEVICE : null;
}

function buildDigestHeader(cfg: DeviceConfig, method: string, uri: string, wwwAuth: string): string {
  const realm  = wwwAuth.match(/realm="([^"]+)"/)?.[1]  ?? '';
  const nonce  = wwwAuth.match(/nonce="([^"]+)"/)?.[1]  ?? '';
  const opaque = wwwAuth.match(/opaque="([^"]+)"/)?.[1] ?? '';
  const qop    = wwwAuth.match(/qop="([^"]+)"/)?.[1]?.split(',')[0].trim() ?? 'auth';
  const nc     = '00000001';
  const cnonce = createHash('md5').update(Math.random().toString()).digest('hex').slice(0, 8);
  const md5    = (s: string) => createHash('md5').update(s).digest('hex');
  const ha1    = md5(`${cfg.user}:${realm}:${cfg.pass}`);
  const ha2    = md5(`${method}:${uri}`);
  const resp   = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  return [
    `Digest username="${cfg.user}"`, `realm="${realm}"`, `nonce="${nonce}"`,
    `uri="${uri}"`, `qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`,
    `response="${resp}"`, opaque ? `opaque="${opaque}"` : '',
  ].filter(Boolean).join(', ');
}

async function fetchDigest(
  cfg: DeviceConfig,
  url: string,
  options: { method: string; headers?: Record<string, string>; body?: string },
  timeoutMs = 10000,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const uri   = new URL(url).pathname + new URL(url).search;
    const first = await fetch(url, {
      method:  options.method,
      headers: options.headers ?? {},
      signal:  controller.signal,
    });
    if (first.status !== 401) return first;
    const wwwAuth = first.headers.get('www-authenticate') ?? '';
    if (!wwwAuth.toLowerCase().includes('digest')) return first;
    return await fetch(url, {
      method:  options.method,
      headers: { ...(options.headers ?? {}), Authorization: buildDigestHeader(cfg, options.method, uri, wwwAuth) },
      body:    options.body,
      signal:  controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Cadastra usuário via insertMulti com UserList (API oficial Intelbras)
async function cadastrarUsuario(cfg: DeviceConfig, userId: string, name: string): Promise<{ ok: boolean; detail: string }> {
  const baseUrl = `http://${cfg.ip}:${cfg.port}`;
  const url  = `${baseUrl}/cgi-bin/AccessUser.cgi?action=insertMulti`;
  const body = JSON.stringify({
    UserList: [{
      UserID:        userId,
      UserName:      name,
      UserType:      0,
      ValidFrom:     '1970-01-01 00:00:00',
      ValidTo:       '2037-12-31 23:59:59',
      Doors:         [0],
      TimeSections:  [255],
    }],
  });

  console.log('[sync-user] Cadastrando usuário →', url);
  const res  = await fetchDigest(cfg, url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  const text = await res.text();
  console.log('[sync-user] Resposta usuário:', res.status, text);
  return { ok: res.ok, detail: text };
}

// Cadastra face via AccessFace.cgi com foto em Base64 (API oficial Intelbras)
async function cadastrarFace(cfg: DeviceConfig, userId: string, imageBuffer: Buffer): Promise<{ ok: boolean; detail: string }> {
  const baseUrl = `http://${cfg.ip}:${cfg.port}`;
  const base64 = imageBuffer.toString('base64');

  // Tenta insertMulti primeiro (maioria dos modelos)
  const urlMulti = `${baseUrl}/cgi-bin/AccessFace.cgi?action=insertMulti`;
  const bodyMulti = JSON.stringify({
    FaceList: [{ UserID: userId, PhotoData: [base64] }],
  });

  console.log('[sync-user] Enviando face (insertMulti) →', urlMulti);
  let res  = await fetchDigest(cfg, urlMulti, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodyMulti });
  let text = await res.text();
  console.log('[sync-user] Resposta face insertMulti:', res.status, text);

  if (res.ok) return { ok: true, detail: text };

  // Fallback: SS 7520T / SS 7530 usam formato diferente
  const urlSingle = `${baseUrl}/cgi-bin/AccessFace.cgi?action=insertMulti`;
  const bodySingle = JSON.stringify({
    FaceList: [{
      UserID: userId,
      Info:   { UserName: userId, PhotoData: [base64] },
    }],
  });

  console.log('[sync-user] Tentando formato SS 7520T →', urlSingle);
  res  = await fetchDigest(cfg, urlSingle, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bodySingle });
  text = await res.text();
  console.log('[sync-user] Resposta face SS7520T:', res.status, text);

  return { ok: res.ok, detail: text };
}

export async function POST(req: NextRequest) {
  try {
    const formData  = await req.formData();
    const userId    = formData.get('userId')    as string | null;
    const name      = formData.get('name')      as string | null;
    const academyId = formData.get('academyId') as string | null;
    const photo     = formData.get('photo')     as File   | null;

    console.log('[sync-user] Recebido — userId:', userId, '| name:', name, '| academyId:', academyId, '| photo:', photo?.name ?? 'nenhuma');

    if (!userId || !name) {
      return NextResponse.json({ ok: false, error: 'userId e name são obrigatórios' }, { status: 400 });
    }

    if (!academyId) {
      return NextResponse.json({ ok: false, error: 'academyId é obrigatório' }, { status: 400 });
    }

    const cfg = await getDeviceConfig(academyId);

    if (!cfg) {
      return NextResponse.json({
        ok: false,
        error: 'Essa academia não tem leitor facial configurado. Cadastre o aluno manualmente no dispositivo.',
      }, { status: 400 });
    }

    const { ok: userOk, detail: userDetail } = await cadastrarUsuario(cfg, userId, name);

    if (!userOk) {
      return NextResponse.json({
        ok: false,
        error: 'Falha ao cadastrar usuário no dispositivo',
        detail: userDetail,
      }, { status: 500 });
    }

    if (photo) {
      const imageBuffer = Buffer.from(await photo.arrayBuffer());
      const { ok: faceOk, detail: faceDetail } = await cadastrarFace(cfg, userId, imageBuffer);
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
    const isTimeout = err.name === 'AbortError';
    const isNetwork = err.cause?.code === 'ECONNREFUSED' || err.cause?.code === 'ENOTFOUND';
    console.error('[sync-user] ERRO:', { name: err.name, message: err.message, cause: err.cause });
    const errorMsg = isTimeout
      ? 'Dispositivo não respondeu em 10s'
      : isNetwork
        ? 'Não foi possível conectar ao leitor facial dessa academia'
        : err.message;
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}