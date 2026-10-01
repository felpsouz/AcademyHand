
import * as admin from 'firebase-admin';

let app: admin.app.App;

function getAdminApp() {
  if (!app) {
    if (admin.apps.length > 0) {
      app = admin.apps[0]!;
    } else {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ?.replace(/\\n/g, '\n')
        .replace(/^"|"$/g, '');

      console.log('[firebase-admin] Inicializando. Variáveis presentes:', {
        temProjectId: !!process.env.FIREBASE_PROJECT_ID,
        temClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
        temPrivateKey: !!privateKey,
        privateKeyFormatoValido:
          !!privateKey?.startsWith('-----BEGIN PRIVATE KEY-----') &&
          !!privateKey?.includes('-----END PRIVATE KEY-----'),
      });

      if (
        !process.env.FIREBASE_PROJECT_ID ||
        !process.env.FIREBASE_CLIENT_EMAIL ||
        !privateKey
      ) {
        throw new Error(
          'Firebase Admin: variáveis de ambiente ausentes ou incompletas.'
        );
      }

      app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
      });

      console.log('[firebase-admin] Inicializado com sucesso.');
    }
  }

  return app;
}

// Acesso ao Firestore
export function adminDb() {
  return getAdminApp().firestore();
}

// Acesso ao Firebase Auth
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
 */
export async function verifyMasterRequest(
  request: Request
): Promise<string> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[verifyMasterRequest] Header Authorization ausente.');
    throw new MasterAuthError('Token de autenticação ausente', 401);
  }

  const idToken = authHeader.slice('Bearer '.length);

  let uid: string;

  try {
    console.log('[verifyMasterRequest] Tentando validar token...');

    const decoded = await adminAuth().verifyIdToken(idToken);

    uid = decoded.uid;

    console.log('[verifyMasterRequest] Token validado. UID:', uid);
  } catch (error: any) {
    console.error('[verifyMasterRequest] ERRO AO VALIDAR TOKEN:', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
    });

    throw new MasterAuthError(
      'Token de autenticação inválido ou expirado',
      401
    );
  }

  try {
    const userDoc = await adminDb()
      .collection('users')
      .doc(uid)
      .get();

    if (!userDoc.exists || userDoc.data()?.role !== 2) {
      console.error(
        '[verifyMasterRequest] Usuário não encontrado ou não é master:',
        uid
      );

      throw new MasterAuthError(
        'Acesso restrito ao usuário master',
        403
      );
    }

    return uid;
  } catch (error) {
    if (error instanceof MasterAuthError) {
      throw error;
    }

    console.error('[verifyMasterRequest] Erro ao consultar Firestore:', error);

    throw error;
  }
}

export interface UsuarioVerificado {
  uid: string;
  role: number;
  academyId: string;
}

/**
 * Verifica qualquer usuário autenticado.
 */
export async function verifyUserRequest(
  request: Request
): Promise<UsuarioVerificado> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    console.error('[verifyUserRequest] Header Authorization ausente.');
    throw new MasterAuthError('Token de autenticação ausente', 401);
  }

  const idToken = authHeader.slice('Bearer '.length);

  let uid: string;

  try {
    console.log('[verifyUserRequest] Tentando validar token...');

    const decoded = await adminAuth().verifyIdToken(idToken);

    uid = decoded.uid;

    console.log('[verifyUserRequest] Token validado. UID:', uid);
  } catch (error: any) {
    console.error('[verifyUserRequest] ERRO AO VALIDAR TOKEN:', {
      name: error?.name,
      code: error?.code,
      message: error?.message,
    });

    throw new MasterAuthError(
      'Token de autenticação inválido ou expirado',
      401
    );
  }

  try {
    const userDoc = await adminDb()
      .collection('users')
      .doc(uid)
      .get();

    if (!userDoc.exists) {
      throw new MasterAuthError('Usuário não encontrado', 401);
    }

    const data = userDoc.data()!;

    return {
      uid,
      role: data.role,
      academyId: data.academyId,
    };
  } catch (error) {
    if (error instanceof MasterAuthError) {
      throw error;
    }

    console.error('[verifyUserRequest] Erro ao consultar Firestore:', error);

    throw error;
  }
}
