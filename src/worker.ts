import { Container, getContainer } from '@cloudflare/containers';
import { env } from 'cloudflare:workers';

const SECRET_KEYS = [
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'ZAPI_INSTANCE_ID',
  'ZAPI_TOKEN',
  'ZAPI_CLIENT_TOKEN',
  'CRON_SECRET',
] as const;

// Secrets do Worker não passam sozinhos pro container: é preciso repassar um por um.
// Só repassa os que existem e avisa no log os que estão faltando.
function buildEnvVars(): Record<string, string> {
  const vars: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of SECRET_KEYS) {
    const value = (env as any)[key];
    if (typeof value === 'string' && value !== '') {
      vars[key] = value;
    } else {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error('[worker] Secrets ausentes no Worker (não serão repassados ao container):', missing);
  } else {
    console.log('[worker] Todos os secrets presentes e repassados ao container.');
  }

  return vars;
}

export class AcademyHandContainer extends Container {
  defaultPort = 3000;
  sleepAfter = '10m';
  envVars = buildEnvVars();

  onError(error: unknown) {
    console.error('[container] erro:', error);
  }

  onStop(params: any) {
    console.log('[container] parou:', params);
  }
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const container = getContainer(env.ACADEMYHAND_CONTAINER);
    return container.fetch(request);
  },
};