import { NextResponse } from 'next/server';
import { adminAuth, adminDb, verifyMasterRequest, MasterAuthError } from '@/lib/firebase-admin';

// PATCH /api/master/users/[uid] — edita nome, studentId, e/ou reseta a senha.
// O papel (role) e a academia não são editáveis aqui de propósito: trocar
// de admin<->aluno deixaria o documento em "students" inconsistente.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await verifyMasterRequest(request);

    const { uid } = await params;
    const body = await request.json();
    const { name, studentId, newPassword } = body;

    const userDoc = await adminDb().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    const userData = userDoc.data()!;

    const updateData: Record<string, any> = {};
    if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
    if (studentId !== undefined) updateData.studentId = studentId || null;

    if (Object.keys(updateData).length > 0) {
      await adminDb().collection('users').doc(uid).update(updateData);

      // Mantém o nome sincronizado no documento de students também, se existir
      if (updateData.name && userData.role === 1) {
        const studentDoc = await adminDb().collection('students').doc(uid).get();
        if (studentDoc.exists) {
          await adminDb().collection('students').doc(uid).update({ name: updateData.name });
        }
      }
    }

    if (typeof newPassword === 'string' && newPassword.length > 0) {
      if (newPassword.length < 6) {
        return NextResponse.json({ error: 'A nova senha deve ter ao menos 6 caracteres' }, { status: 400 });
      }
      await adminAuth().updateUser(uid, { password: newPassword });
    }

    return NextResponse.json({ uid, ...updateData });
  } catch (error: any) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao atualizar usuário:', error);
    return NextResponse.json({ error: 'Erro interno ao atualizar usuário' }, { status: 500 });
  }
}

// DELETE /api/master/users/[uid] — remove o acesso por completo (Auth + Firestore)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    await verifyMasterRequest(request);

    const { uid } = await params;

    const userDoc = await adminDb().collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }
    const userData = userDoc.data()!;

    // Apaga a conta de autenticação — sem isso, o e-mail fica "preso" e
    // ninguém mais consegue se cadastrar com ele depois.
    try {
      await adminAuth().deleteUser(uid);
    } catch (err) {
      console.warn(`Conta de Auth ${uid} já não existia ou falhou ao apagar:`, err);
    }

    await adminDb().collection('users').doc(uid).delete();

    if (userData.role === 1) {
      await adminDb().collection('students').doc(uid).delete().catch(() => {});
    }

    return NextResponse.json({ uid, deleted: true });
  } catch (error) {
    if (error instanceof MasterAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Erro ao remover usuário:', error);
    return NextResponse.json({ error: 'Erro interno ao remover usuário' }, { status: 500 });
  }
}