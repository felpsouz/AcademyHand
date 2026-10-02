import { Container, getContainer } from '@cloudflare/containers';

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
function buildEnvVars(workerEnv: any): Record<string, string> {
  const vars: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of SECRET_KEYS) {
    const value = workerEnv?.[key];
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

  constructor(ctx: any, env: any) {
    super(ctx, env);
    this.envVars = buildEnvVars(env);
  }

  onError(error: unknown) {
    console.error('[container] erro:', error);
  }

  onStop(params: any) {
    console.log('[container] parou:', params);
  }
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // O nome da instância força um container novo (com imagem e secrets atuais).
    // Para forçar outra troca no futuro, mude 'v4' para 'v4' e assim por diante.
    const container = getContainer(env.ACADEMYHAND_CONTAINER, 'v3');
    return container.fetch(request);
  },
};