import * as admin from 'firebase-admin';

let app: admin.app.App;

function getAdminApp() {
  if (!app) {
    if (admin.apps.length > 0) {
      app = admin.apps[0]!;
    } else {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/\\n/g, '\n')
        .replace(/^"|"$/g, ''); // remove aspas extras se houver

      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });
    }
  }
  return app;
}

// Mantido igual ao original — usado em todo o resto do sistema
export function adminDb() {
  return getAdminApp().firestore();
}

// Novo: acesso ao Firebase Auth via Admin SDK (criar/editar/apagar contas)
export function adminAuth() {
  return getAdminApp().auth();
}

export class MasterAuthError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifica se a requisição vem de um usuário master (role === 2).
 * Espera o header: Authorization: Bearer <idToken>
 * Lança MasterAuthError se não autenticado ou não for master.
 * Retorna o uid do usuário verificado.
 */
export async function verifyMasterRequest(request: Request): Promise<string> {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new MasterAuthError('Token de autenticação ausente', 401);
  }

  const idToken = authHeader.slice('Bearer '.length);

  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (error) {
    throw new MasterAuthError('Token de autenticação inválido ou expirado', 401);
  }

  const userDoc = await adminDb().collection('users').doc(uid).get();

  if (!userDoc.exists || userDoc.data()?.role !== 2) {
    throw new MasterAuthError('Acesso restrito ao usuário master', 403);
  }

  return uid;
}