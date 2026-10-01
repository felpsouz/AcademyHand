import { Container, getContainer } from '@cloudflare/containers';
import { env } from 'cloudflare:workers';

export class AcademyHandContainer extends Container {
  defaultPort = 3000;
  sleepAfter = '10m';

  // IMPORTANTE: secrets configurados com "wrangler secret put" ficam
  // disponíveis só pro Worker — não passam sozinhos pro container.
  // Precisa repassar explicitamente aqui, um por um.
  envVars = {
    FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: env.FIREBASE_PRIVATE_KEY,
    ZAPI_INSTANCE_ID: env.ZAPI_INSTANCE_ID,
    ZAPI_TOKEN: env.ZAPI_TOKEN,
    ZAPI_CLIENT_TOKEN: env.ZAPI_CLIENT_TOKEN,
    CRON_SECRET: env.CRON_SECRET,
  };
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const container = getContainer(env.ACADEMYHAND_CONTAINER);
    return container.fetch(request);
  },
};