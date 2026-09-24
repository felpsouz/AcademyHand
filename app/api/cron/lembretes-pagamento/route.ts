import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { enviarWhatsApp } from '@/lib/whatsapp';

export const maxDuration = 60;

function diasAteVencimento(dataStr: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(dataStr);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

// GET /api/cron/lembretes-pagamento — chamado 1x por dia pelo Vercel Cron.
// Protegido por CRON_SECRET: só quem tiver o segredo (o próprio Vercel, ou
// você testando manualmente) consegue disparar.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const db = adminDb();
  const hojeStr = new Date().toISOString().split('T')[0];

  const academiasSnap = await db.collection('academies').where('lembretesWhatsapp', '==', true).get();

  let vencendoEnviados = 0;
  let vencidosEnviados = 0;
  let erros = 0;

  for (const academiaDoc of academiasSnap.docs) {
    const academia = academiaDoc.data();
    if (academia.ativa === false) continue;

    const studentsSnap = await db.collection('students')
      .where('academyId', '==', academiaDoc.id)
      .where('status', '==', 'active')
      .get();

    for (const studentDoc of studentsSnap.docs) {
      const student = studentDoc.data();
      if (!student.phone) continue;

      // Data de vencimento: prioriza pagamento manual (Pix/dinheiro) vencendo,
      // depois a próxima cobrança do Stripe, depois o vencimento original de cadastro
      const dataVencimento = student.manualPaymentUntil || student.nextPaymentAt || student.nextPaymentDue;
      if (!dataVencimento) continue;

      const dias = diasAteVencimento(dataVencimento);
      const statusAtual = student.stripePaymentStatus ?? 'pending';

      try {
        // Vencendo em 3 dias — só manda 1x (controlado por data do último envio)
        if (dias === 3 && student.lembreteVencendoEnviadoEm !== hojeStr) {
          const ok = await enviarWhatsApp(
            student.phone,
            `Olá, ${student.name}! 👋\n\nSua mensalidade na *${academia.nome}* vence em 3 dias.\n\nPara evitar interrupção do seu acesso, regularize o pagamento assim que possível.`
          );
          if (ok) {
            await studentDoc.ref.update({ lembreteVencendoEnviadoEm: hojeStr });
            vencendoEnviados++;
          } else {
            erros++;
          }
        }

        // Venceu hoje e ainda não está pago — manda 1x
        if (dias === 0 && statusAtual !== 'active' && student.lembreteVencidoEnviadoEm !== hojeStr) {
          const ok = await enviarWhatsApp(
            student.phone,
            `Olá, ${student.name}! ⚠️\n\nSua mensalidade na *${academia.nome}* venceu hoje.\n\nRegularize o quanto antes para manter seu acesso ativo.`
          );
          if (ok) {
            await studentDoc.ref.update({ lembreteVencidoEnviadoEm: hojeStr });
            vencidosEnviados++;
          } else {
            erros++;
          }
        }
      } catch (err) {
        console.error(`Erro ao processar lembrete do aluno ${studentDoc.id}:`, err);
        erros++;
      }
    }
  }

  return NextResponse.json({ ok: true, vencendoEnviados, vencidosEnviados, erros });
}