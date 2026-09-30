import { Container, getContainer } from '@cloudflare/containers';

// A classe representa "uma instância do container" — o Cloudflare cuida do
// ciclo de vida (ligar, desligar depois de inativo, reiniciar se cair).
export class AcademyHandContainer extends Container {
  // Porta que o Next.js escuta dentro do container (definida no Dockerfile)
  defaultPort = 3000;
  // Desliga o container depois de 10 minutos sem nenhuma requisição,
  // economizando — ele liga de novo sozinho na próxima requisição (leva
  // uns 2-3 segundos de "cold start" nesse caso)
  sleepAfter = '10m';
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // Todas as requisições vão pra mesma instância do container — como é
    // uma aplicação web normal (não algo que precisa de múltiplas réplicas
    // isoladas por usuário), isso é suficiente pro começo.
    const container = getContainer(env.ACADEMYHAND_CONTAINER);
    return container.fetch(request);
  },
};