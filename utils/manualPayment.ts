import { firestoreService } from '@/services/firebase/firestore';

/**
 * Um pagamento manual venceu quando manualPayment=true e a data limite
 * (manualPaymentUntil) já passou.
 */
export function isManualPaymentExpired(student: any): boolean {
  return (
    student?.manualPayment === true &&
    !!student?.manualPaymentUntil &&
    new Date(student.manualPaymentUntil).getTime() <= Date.now()
  );
}

/**
 * Reverte um pagamento manual vencido no Firestore. Só funciona quando quem
 * chama tem permissão de escrita em "students" (admin) — as regras do
 * Firestore não deixam o próprio aluno editar esse documento.
 */
export async function revertExpiredManualPayment(studentId: string): Promise<void> {
  await firestoreService.updateDocument('students', studentId, {
    manualPayment: false,
    stripePaymentStatus: 'pending',
  } as any);
}

/**
 * Para uso em telas de ADMIN (que têm permissão de escrita): recebe uma
 * lista de alunos, corrige em memória quem estiver com pagamento manual
 * vencido, e dispara a atualização no Firestore em segundo plano (não
 * bloqueia a tela esperando isso terminar).
 */
export function applyManualPaymentExpiration<T extends { id: string }>(students: T[]): T[] {
  return students.map((student) => {
    if (isManualPaymentExpired(student)) {
      revertExpiredManualPayment(student.id).catch((err) =>
        console.error('Erro ao reverter pagamento manual vencido:', err)
      );
      return { ...student, manualPayment: false, stripePaymentStatus: 'pending' } as T;
    }
    return student;
  });
}

/**
 * Para uso na tela do ALUNO (sem permissão de escrita): corrige só a exibição,
 * sem tentar gravar nada no Firestore. A correção definitiva acontece quando
 * um admin abrir alguma tela que liste alunos.
 */
export function getStudentDisplayData<T extends Record<string, any>>(student: T): T {
  if (isManualPaymentExpired(student)) {
    return { ...student, manualPayment: false, stripePaymentStatus: 'pending' };
  }
  return student;
}