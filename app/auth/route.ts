import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

function parseBody(text: string): Record<string, any> {
  const match = text.match(/name="info"[\s\S]*?Content-Length:.*?\r?\n\r?\n([\s\S]*?)(?:\r?\n--myboundary|$)/i);
  if (match?.[1]) {
    try { return JSON.parse(match[1].trim()); } catch {}
  }

  const match2 = text.match(/name="info"\r?\n\r?\n([\s\S]*?)(?:\r?\n--|$)/i);
  if (match2?.[1]) {
    try { return JSON.parse(match2[1].trim()); } catch {}
  }

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch {}
  }

  return {};
}

function authResponse(auth: boolean, message: string) {
  const body = JSON.stringify({ code: '200', auth: auth ? 'true' : 'false', message });
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body).toString(),
    },
  });
}

const NOMES_DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export async function POST(req: NextRequest) {
  try {
    const text        = await req.text();
    const contentType = req.headers.get('content-type') ?? '';

    let body: Record<string, any> = {};

    if (contentType.includes('application/json')) {
      try { body = JSON.parse(text); } catch {}
    } else {
      body = parseBody(text);
    }

    const events    = body?.Events ?? [];
    const eventData = events[0]?.Data ?? {};

    const userId = (
      eventData?.UserID ??
      eventData?.CardNo ??
      body?.UserID ??
      body?.CardNo
    )?.toString();

    if (!userId || userId === '') {
      return authResponse(false, 'ID não encontrado');
    }

    const db         = adminDb();
    const studentDoc = await db.collection('students').doc(userId).get();

    if (!studentDoc.exists) {
      return authResponse(false, 'Aluno não encontrado');
    }

    const student       = studentDoc.data()!;
    const paymentStatus = student.stripePaymentStatus ?? 'pending';
    const isActive      = student.status === 'active';
    const isStripePaid  = paymentStatus === 'active';

    // Verifica pagamento manual
    const manualPayment      = student.manualPayment === true;
    const manualPaymentUntil = student.manualPaymentUntil;
    const isManualActive     = manualPayment &&
      manualPaymentUntil &&
      new Date(manualPaymentUntil) > new Date();

    // Se pagamento manual expirou, limpa automaticamente
    if (manualPayment && !isManualActive) {
      await db.collection('students').doc(userId).update({
        manualPayment:       false,
        stripePaymentStatus: 'pending',
      });
    }

    const isPaid = isStripePaid || isManualActive;

    if (!isActive || !isPaid) {
      let message = 'Acesso negado';
      if (!isActive)                          message = 'Aluno inativo';
      else if (paymentStatus === 'overdue')    message = 'Pagamento em atraso';
      else if (paymentStatus === 'pending')    message = 'Pagamento pendente';
      else if (paymentStatus === 'cancelled')  message = 'Assinatura cancelada';

      return authResponse(false, message);
    }

    // ── Validação de dias permitidos pelo plano ──────────────────────────────
    const diasPermitidos: number[] | undefined = student.diasPermitidos;

    if (diasPermitidos && diasPermitidos.length > 0) {
      const hoje = new Date().getDay(); // 0=Dom … 6=Sáb

      if (!diasPermitidos.includes(hoje)) {
        const diasLabel = diasPermitidos.map((d: number) => NOMES_DIAS[d]).join(', ');
        return authResponse(false, `Acesso permitido apenas: ${diasLabel}`);
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // Registra presença
    const now     = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    await db.collection('attendance').add({
      studentId:            userId,
      studentName:          student.name,
      date:                 dateStr,
      time:                 timeStr,
      confirmed:            true,
      source:               'facial',
      paymentStatusAtEntry: isManualActive ? 'manual' : paymentStatus,
      approved:             true,
      createdAt:            now.toISOString(),
    });

    return authResponse(true, `Bem-vindo, ${student.name}!`);

  } catch (err: any) {
    console.error('[auth] Erro:', err);
    return authResponse(false, 'Erro interno');
  }
}

export async function GET() {
  return new NextResponse('OK', { status: 200 });
}
