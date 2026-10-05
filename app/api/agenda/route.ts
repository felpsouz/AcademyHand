import { NextResponse } from 'next/server';
import type { DocumentReference } from 'firebase-admin/firestore';
import {
  adminDb,
  verifyUserRequest,
  MasterAuthError,
  type UsuarioVerificado,
} from '@/lib/firebase-admin';
import {
  ALUNO_PODE_LIBERAR,
  HORA_REGEX,
  MAX_SLOTS_POR_GERACAO,
  gerarHorarios,
  resolverLimiteSemanal,
  slotId,
} from '@/lib/agenda';

export const dynamic = 'force-dynamic';

const COLECAO = 'agenda_slots';

class AgendaError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function tratarErro(error: unknown) {
  if (error instanceof AgendaError || error instanceof MasterAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('[agenda] Erro interno:', error);
  return NextResponse.json({ error: 'Erro interno na agenda' }, { status: 500 });
}

function exigirAdmin(u: UsuarioVerificado) {
  if (u.role !== 0) throw new AgendaError('Apenas o personal pode fazer isso', 403);
}

// A agenda é opcional por academia: só funciona se academies/{id}.usaAgenda === true
async function exigirAgendaHabilitada(academyId: string) {
  const snap = await adminDb().collection('academies').doc(academyId).get();
  if (!snap.exists || snap.data()?.usaAgenda !== true) {
    throw new AgendaError('A agenda de horários não está habilitada para esta academia', 403);
  }
}

function lerDias(valor: unknown): number[] {
  const dias: number[] = Array.isArray(valor) ? Array.from(new Set<number>(valor.map(Number))) : [];
  if (dias.some(d => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new AgendaError('Dia da semana inválido');
  }
  return dias;
}

// Apaga só os horários que continuam LIVRES no momento da exclusão (cada bloco roda numa
// transação, então um aluno que reservou nesse instante nunca perde o horário por engano).
async function apagarLivres(db: ReturnType<typeof adminDb>, refs: DocumentReference[]): Promise<number> {
  let removidos = 0;

  for (let i = 0; i < refs.length; i += 200) {
    const bloco = refs.slice(i, i + 200);
    removidos += await db.runTransaction(async tx => {
      const snaps = await tx.getAll(...bloco);
      let n = 0;
      snaps.forEach(s => {
        if (s.exists && !s.data()?.studentId) {
          tx.delete(s.ref);
          n++;
        }
      });
      return n;
    });
  }

  return removidos;
}

// ── GET: lista os horários ────────────────────────────────────────────────────
// Personal: vê quem ocupa cada horário. Aluno: vê só livre / ocupado / meu
// (o nome de outros alunos nunca sai do servidor).
export async function GET(request: Request) {
  try {
    const u = await verifyUserRequest(request);
    if (!u.academyId) throw new AgendaError('Usuário sem academia vinculada', 403);
    await exigirAgendaHabilitada(u.academyId);

    const db = adminDb();
    const snap = await db.collection(COLECAO).where('academyId', '==', u.academyId).get();

    const slots = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as any[];
    slots.sort((a, b) => a.time.localeCompare(b.time) || a.dayOfWeek - b.dayOfWeek);

    if (u.role === 0) {
      return NextResponse.json({
        papel: 'admin',
        slots: slots.map(s => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          time: s.time,
          duration: s.duration,
          studentId: s.studentId ?? null,
          studentName: s.studentName ?? null,
        })),
      });
    }

    if (u.role === 1) {
      const alunoSnap = await db.collection('students').doc(u.uid).get();
      const limite = alunoSnap.exists ? resolverLimiteSemanal(alunoSnap.data()) : null;
      const usados = slots.filter(s => s.studentId === u.uid).length;

      return NextResponse.json({
        papel: 'aluno',
        limite,
        usados,
        podeLiberar: ALUNO_PODE_LIBERAR,
        slots: slots.map(s => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          time: s.time,
          duration: s.duration,
          status: !s.studentId ? 'livre' : s.studentId === u.uid ? 'meu' : 'ocupado',
        })),
      });
    }

    throw new AgendaError('Acesso não permitido', 403);
  } catch (error) {
    return tratarErro(error);
  }
}

// ── POST: ações (gerar, limpar, remover, mover, reservar, liberar, liberarAluno) ──
export async function POST(request: Request) {
  try {
    const u = await verifyUserRequest(request);
    if (!u.academyId) throw new AgendaError('Usuário sem academia vinculada', 403);
    await exigirAgendaHabilitada(u.academyId);

    const body = await request.json().catch(() => ({}));

    switch (body?.acao) {
      case 'gerar':        return await gerar(u, body);
      case 'limpar':       return await limpar(u, body);
      case 'remover':      return await remover(u, body);
      case 'mover':        return await mover(u, body);
      case 'reservar':     return await reservar(u, body);
      case 'liberar':      return await liberar(u, body);
      case 'liberarAluno': return await liberarAluno(u, body);
      default:             throw new AgendaError('Ação inválida');
    }
  } catch (error) {
    return tratarErro(error);
  }
}

// Personal: cria os horários disponíveis.
// Com substituir=true, também remove os horários LIVRES dos mesmos dias que não fazem parte
// da nova grade (e atualiza a duração dos que continuam). Horário com aluno nunca é alterado.
async function gerar(u: UsuarioVerificado, body: any) {
  exigirAdmin(u);

  const dias = lerDias(body.dias);
  if (dias.length === 0) throw new AgendaError('Selecione ao menos um dia da semana');

  const substituir = body.substituir === true;

  const { inicio, fim } = body;
  const duracao = Number(body.duracao);
  if (!HORA_REGEX.test(inicio) || !HORA_REGEX.test(fim)) {
    throw new AgendaError('Horário inicial ou final inválido');
  }
  if (!Number.isInteger(duracao) || duracao < 15 || duracao > 240) {
    throw new AgendaError('Duração inválida (entre 15 e 240 minutos)');
  }

  const horarios = gerarHorarios(inicio, fim, duracao);
  if (horarios.length === 0) {
    throw new AgendaError('O intervalo precisa comportar pelo menos um treino');
  }
  if (dias.length * horarios.length > MAX_SLOTS_POR_GERACAO) {
    throw new AgendaError(`Muitos horários de uma vez (máximo ${MAX_SLOTS_POR_GERACAO})`);
  }

  const db = adminDb();
  const colecao = db.collection(COLECAO);

  const candidatos = dias.flatMap(dia =>
    horarios.map(time => ({
      dia,
      time,
      ref: colecao.doc(slotId(u.academyId, dia, time)),
    }))
  );
  const alvoIds = new Set(candidatos.map(c => c.ref.id));

  // 1) Modo substituir: remove os livres desses dias que não estão na nova grade
  let removidos = 0;
  if (substituir) {
    const snap = await colecao.where('academyId', '==', u.academyId).get();
    const refsParaApagar = snap.docs
      .filter(d => {
        const s = d.data();
        return dias.includes(s.dayOfWeek) && !s.studentId && !alvoIds.has(d.id);
      })
      .map(d => d.ref);

    removidos = await apagarLivres(db, refsParaApagar);
  }

  // 2) Cria os que faltam (e, no modo substituir, ajusta a duração dos livres que continuam)
  const existentes = await db.getAll(...candidatos.map(c => c.ref));
  const batch = db.batch();
  const agora = new Date().toISOString();
  let criados = 0;
  let atualizados = 0;
  let ignorados = 0;

  candidatos.forEach((c, i) => {
    const atual = existentes[i];

    if (atual.exists) {
      const s = atual.data()!;
      if (substituir && !s.studentId && s.duration !== duracao) {
        batch.update(c.ref, { duration: duracao });
        atualizados++;
      } else {
        ignorados++;
      }
      return;
    }

    batch.create(c.ref, {
      academyId: u.academyId,
      dayOfWeek: c.dia,
      time: c.time,
      duration: duracao,
      studentId: null,
      studentName: null,
      bookedAt: null,
      createdAt: agora,
    });
    criados++;
  });

  if (criados + atualizados > 0) await batch.commit();

  return NextResponse.json({ ok: true, criados, atualizados, removidos, ignorados });
}

// Personal: remove TODOS os horários livres dos dias escolhidos (sem "dias" = todos os dias).
// Horários com aluno ficam como estão e são contados na resposta.
async function limpar(u: UsuarioVerificado, body: any) {
  exigirAdmin(u);

  const dias = lerDias(body.dias);

  const db = adminDb();
  const snap = await db.collection(COLECAO).where('academyId', '==', u.academyId).get();

  const refsLivres: DocumentReference[] = [];
  let ocupadosMantidos = 0;

  snap.docs.forEach(d => {
    const s = d.data();
    if (dias.length > 0 && !dias.includes(s.dayOfWeek)) return;
    if (s.studentId) {
      ocupadosMantidos++;
    } else {
      refsLivres.push(d.ref);
    }
  });

  const removidos = await apagarLivres(db, refsLivres);

  return NextResponse.json({ ok: true, removidos, ocupadosMantidos });
}

// Personal: remove um horário da grade. Se estiver ocupado, só com forcar=true
// (o aluno perde a vaga e o horário sai da grade).
async function remover(u: UsuarioVerificado, body: any) {
  exigirAdmin(u);

  const id = String(body.slotId ?? '');
  if (!id) throw new AgendaError('Horário não informado');

  const forcar = body.forcar === true;

  const db = adminDb();
  const ref = db.collection(COLECAO).doc(id);

  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.academyId !== u.academyId) {
      throw new AgendaError('Horário não encontrado', 404);
    }
    if (snap.data()?.studentId && !forcar) {
      throw new AgendaError('Horário ocupado: libere o aluno antes de remover', 409);
    }
    tx.delete(ref);
  });

  return NextResponse.json({ ok: true });
}

// Personal: move o aluno de um horário para outro (dia + hora). Se o destino não existe na
// grade, ele é criado; se existe e está livre, é ocupado. O horário de origem fica livre.
// O total de treinos do aluno não muda, então o limite do plano não entra aqui.
async function mover(u: UsuarioVerificado, body: any) {
  exigirAdmin(u);

  const origemId = String(body.slotId ?? '');
  if (!origemId) throw new AgendaError('Horário de origem não informado');

  const dia = Number(body.dia);
  const horario = String(body.horario ?? '');
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) throw new AgendaError('Dia de destino inválido');
  if (!HORA_REGEX.test(horario)) throw new AgendaError('Horário de destino inválido');

  const db = adminDb();
  const colecao = db.collection(COLECAO);
  const origemRef = colecao.doc(origemId);
  const destinoRef = colecao.doc(slotId(u.academyId, dia, horario));

  if (origemRef.id === destinoRef.id) {
    throw new AgendaError('O aluno já está nesse horário');
  }

  await db.runTransaction(async tx => {
    const [origemSnap, destinoSnap] = await Promise.all([tx.get(origemRef), tx.get(destinoRef)]);

    if (!origemSnap.exists || origemSnap.data()?.academyId !== u.academyId) {
      throw new AgendaError('Horário de origem não encontrado', 404);
    }

    const origem = origemSnap.data()!;
    if (!origem.studentId) {
      throw new AgendaError('Esse horário não tem aluno para mover');
    }

    const agora = new Date().toISOString();
    const dadosAluno = {
      studentId: origem.studentId,
      studentName: origem.studentName ?? null,
      bookedAt: agora,
      bookedBy: u.uid,
    };

    if (destinoSnap.exists) {
      const destino = destinoSnap.data()!;
      if (destino.academyId !== u.academyId) {
        throw new AgendaError('Horário de destino não encontrado', 404);
      }
      if (destino.studentId) {
        throw new AgendaError('O horário de destino já está ocupado por outro aluno', 409);
      }
      tx.update(destinoRef, dadosAluno);
    } else {
      tx.create(destinoRef, {
        academyId: u.academyId,
        dayOfWeek: dia,
        time: horario,
        duration: origem.duration ?? 60,
        createdAt: agora,
        ...dadosAluno,
      });
    }

    tx.update(origemRef, { studentId: null, studentName: null, bookedAt: null, bookedBy: null });
  });

  return NextResponse.json({ ok: true });
}

// Aluno (para si) ou personal (para qualquer aluno): ocupa um horário
async function reservar(u: UsuarioVerificado, body: any) {
  const ehAdmin = u.role === 0;
  if (!ehAdmin && u.role !== 1) throw new AgendaError('Acesso não permitido', 403);

  const id = String(body.slotId ?? '');
  if (!id) throw new AgendaError('Horário não informado');

  const alunoId = ehAdmin ? String(body.studentId ?? '') : u.uid;
  if (!alunoId) throw new AgendaError('Aluno não informado');

  // Só o personal pode passar do limite do plano
  const ignorarLimite = ehAdmin && body.ignorarLimite === true;

  const db = adminDb();
  const slotRef = db.collection(COLECAO).doc(id);
  const alunoRef = db.collection('students').doc(alunoId);
  const meusQuery = db
    .collection(COLECAO)
    .where('academyId', '==', u.academyId)
    .where('studentId', '==', alunoId);

  await db.runTransaction(async tx => {
    const [slotSnap, alunoSnap, meusSnap] = await Promise.all([
      tx.get(slotRef),
      tx.get(alunoRef),
      tx.get(meusQuery),
    ]);

    if (!slotSnap.exists || slotSnap.data()?.academyId !== u.academyId) {
      throw new AgendaError('Horário não encontrado', 404);
    }
    if (!alunoSnap.exists || alunoSnap.data()?.academyId !== u.academyId) {
      throw new AgendaError('Aluno não encontrado', 404);
    }

    const slot = slotSnap.data()!;
    const aluno = alunoSnap.data()!;

    if (!ehAdmin && aluno.status !== 'active') {
      throw new AgendaError('Seu cadastro está inativo. Fale com o personal.', 403);
    }

    if (slot.studentId) {
      if (slot.studentId === alunoId) return; // já é dele, nada a fazer
      throw new AgendaError('Esse horário acabou de ser ocupado por outro aluno', 409);
    }

    if (!ignorarLimite) {
      const limite = resolverLimiteSemanal(aluno);
      const usados = meusSnap.size;

      if (limite === null) {
        throw new AgendaError(
          ehAdmin
            ? 'Aluno sem "vezes por semana" definido. Edite o cadastro dele ou marque "ignorar limite".'
            : 'Seu plano ainda não tem a quantidade de treinos definida. Fale com o personal.',
          403
        );
      }
      if (usados >= limite) {
        throw new AgendaError(
          ehAdmin
            ? `Aluno já está no limite do plano (${usados} de ${limite}). Marque "ignorar limite" para exceder.`
            : `Você já escolheu ${usados} de ${limite} treinos do seu plano. Para alterar, fale com o personal.`,
          403
        );
      }
    }

    tx.update(slotRef, {
      studentId: alunoId,
      studentName: aluno.name ?? null,
      bookedAt: new Date().toISOString(),
      bookedBy: u.uid,
    });
  });

  return NextResponse.json({ ok: true });
}

// Personal (qualquer horário) ou aluno (só o próprio, se ALUNO_PODE_LIBERAR): libera o horário
async function liberar(u: UsuarioVerificado, body: any) {
  const ehAdmin = u.role === 0;
  if (!ehAdmin && !(u.role === 1 && ALUNO_PODE_LIBERAR)) {
    throw new AgendaError('Apenas o personal pode liberar horários', 403);
  }

  const id = String(body.slotId ?? '');
  if (!id) throw new AgendaError('Horário não informado');

  const db = adminDb();
  const ref = db.collection(COLECAO).doc(id);

  await db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.academyId !== u.academyId) {
      throw new AgendaError('Horário não encontrado', 404);
    }

    const slot = snap.data()!;
    if (!slot.studentId) return;
    if (!ehAdmin && slot.studentId !== u.uid) {
      throw new AgendaError('Esse horário não é seu', 403);
    }

    tx.update(ref, { studentId: null, studentName: null, bookedAt: null, bookedBy: null });
  });

  return NextResponse.json({ ok: true });
}

// Personal: libera todos os horários de um aluno (usado ao excluir o aluno)
async function liberarAluno(u: UsuarioVerificado, body: any) {
  exigirAdmin(u);

  const alunoId = String(body.studentId ?? '');
  if (!alunoId) throw new AgendaError('Aluno não informado');

  const db = adminDb();
  const snap = await db
    .collection(COLECAO)
    .where('academyId', '==', u.academyId)
    .where('studentId', '==', alunoId)
    .get();

  if (!snap.empty) {
    const batch = db.batch();
    snap.docs.forEach(d =>
      batch.update(d.ref, { studentId: null, studentName: null, bookedAt: null, bookedBy: null })
    );
    await batch.commit();
  }

  return NextResponse.json({ ok: true, liberados: snap.size });
}