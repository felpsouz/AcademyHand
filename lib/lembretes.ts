import { adminDb } from './firebase-admin';
import { enviarWhatsApp } from './whatsapp';

function diasAteVencimento(dataStr: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(dataStr);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

export interface ResultadoLembretes {
  vencendoEnviados: number;
  vencidosEnviados: number;
  erros: number;
}

/**
 * Processa os lembretes de uma ÚNICA academia. Usado tanto pelo cron
 * automático (todas as academias) quanto pelo disparo manual (admin dispara
 * só a própria, master pode escolher).
 */
export async function processarLembretesAcademia(academyId: string): Promise<ResultadoLembretes> {
  const db = adminDb();
  const hojeStr = new Date().toISOString().split('T')[0];

  const resultado: ResultadoLembretes = { vencendoEnviados: 0, vencidosEnviados: 0, erros: 0 };

  const academiaDoc = await db.collection('academies').doc(academyId).get();
  if (!academiaDoc.exists) return resultado;
  const academia = academiaDoc.data()!;
  if (academia.ativa === false) return resultado;

  const studentsSnap = await db.collection('students')
    .where('academyId', '==', academyId)
    .where('status', '==', 'active')
    .get();

  for (const studentDoc of studentsSnap.docs) {
    const student = studentDoc.data();
    if (!student.phone) continue;

    const dataVencimento = student.manualPaymentUntil || student.nextPaymentAt || student.nextPaymentDue;
    if (!dataVencimento) continue;

    const dias = diasAteVencimento(dataVencimento);
    const statusAtual = student.stripePaymentStatus ?? 'pending';

    try {
      if (dias === 3 && student.lembreteVencendoEnviadoEm !== hojeStr) {
        const ok = await enviarWhatsApp(
          student.phone,
          `Olá, ${student.name}! 👋\n\nSua mensalidade na *${academia.nome}* vence em 3 dias.\n\nPara evitar interrupção do seu acesso, regularize o pagamento assim que possível.`
        );
        if (ok) {
          await studentDoc.ref.update({ lembreteVencendoEnviadoEm: hojeStr });
          resultado.vencendoEnviados++;
        } else {
          resultado.erros++;
        }
      }

      if (dias === 0 && statusAtual !== 'active' && student.lembreteVencidoEnviadoEm !== hojeStr) {
        const ok = await enviarWhatsApp(
          student.phone,
          `Olá, ${student.name}! ⚠️\n\nSua mensalidade na *${academia.nome}* venceu hoje.\n\nRegularize o quanto antes para manter seu acesso ativo.`
        );
        if (ok) {
          await studentDoc.ref.update({ lembreteVencidoEnviadoEm: hojeStr });
          resultado.vencidosEnviados++;
        } else {
          resultado.erros++;
        }
      }
    } catch (err) {
      console.error(`Erro ao processar lembrete do aluno ${studentDoc.id}:`, err);
      resultado.erros++;
    }
  }

  return resultado;
}

/** Processa os lembretes de TODAS as academias com lembretesWhatsapp ativo — usado pelo cron. */
export async function processarTodosLembretes(): Promise<ResultadoLembretes & { academiasProcessadas: number }> {
  const db = adminDb();
  const academiasSnap = await db.collection('academies').where('lembretesWhatsapp', '==', true).get();

  const total: ResultadoLembretes & { academiasProcessadas: number } = {
    vencendoEnviados: 0, vencidosEnviados: 0, erros: 0, academiasProcessadas: 0,
  };

  for (const academiaDoc of academiasSnap.docs) {
    const r = await processarLembretesAcademia(academiaDoc.id);
    total.vencendoEnviados += r.vencendoEnviados;
    total.vencidosEnviados += r.vencidosEnviados;
    total.erros += r.erros;
    total.academiasProcessadas++;
  }

  return total;
}