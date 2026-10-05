'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, GraduationCap, Power, Plus, LogOut } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useMasterPanel } from '@/hooks/useMasterPanel';
import { CreateAcademyModal } from './CreateAcademyModal';
import { EditAcademyModal } from './EditAcademyModal';
import { AcademyUsersModal } from './AcademyUsersModal';
import { CreateUserModal } from './CreateUserModal';

interface MasterViewProps {
  onLogout: () => void;
}

export function MasterView({ onLogout }: MasterViewProps) {
  const {
    academias,
    totais,
    loading,
    error,
    carregarOverview,
    criarAcademia,
    alternarStatusAcademia,
    obterAcademia,
    atualizarAcademia,
    listarUsuariosDaAcademia,
    atualizarUsuario,
    removerUsuario,
    criarUsuario,
  } = useMasterPanel();

  const [modalAcademiaAberto, setModalAcademiaAberto] = useState(false);
  const [academiaParaEditar, setAcademiaParaEditar] = useState<string | null>(null);
  const [academiaParaVerUsuarios, setAcademiaParaVerUsuarios] = useState<{ id: string; nome: string } | null>(null);
  const [modalUsuarioAberto, setModalUsuarioAberto] = useState(false);
  const [academiaParaNovoUsuario, setAcademiaParaNovoUsuario] = useState<string | undefined>();
  const [alterandoStatus, setAlterandoStatus] = useState<string | null>(null);

  useEffect(() => {
    carregarOverview();
  }, [carregarOverview]);

  const handleAlternarStatus = async (academyId: string, statusAtual: boolean) => {
    setAlterandoStatus(academyId);
    try {
      await alternarStatusAcademia(academyId, !statusAtual);
    } catch (err) {
      console.error('Erro ao alterar status da academia:', err);
    } finally {
      setAlterandoStatus(null);
    }
  };

  const abrirNovoUsuario = (academyId?: string) => {
    setAcademiaParaNovoUsuario(academyId);
    setModalUsuarioAberto(true);
  };

  if (loading && academias.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Painel Master</h1>
          <p className="text-xs sm:text-sm text-gray-500 truncate">Gerencie todas as academias do sistema</p>
        </div>
        <Button variant="secondary" onClick={onLogout} className="flex items-center gap-2 flex-shrink-0">
          <LogOut className="w-4 h-4" />
          Sair
        </Button>
      </header>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Cards de totais */}
        {totais && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm mb-1">
                <Building2 className="w-4 h-4 flex-shrink-0" /> Academias
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{totais.totalAcademias}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm mb-1">
                <Power className="w-4 h-4 flex-shrink-0" /> Ativas
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{totais.academiasAtivas}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm mb-1">
                <Users className="w-4 h-4 flex-shrink-0" /> Admins
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{totais.totalAdmins}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-gray-500 text-xs sm:text-sm mb-1">
                <GraduationCap className="w-4 h-4 flex-shrink-0" /> Alunos
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{totais.totalAlunos}</p>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="primary"
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
            onClick={() => setModalAcademiaAberto(true)}
          >
            <Plus className="w-4 h-4" /> Nova academia
          </Button>
          <Button
            variant="secondary"
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
            onClick={() => abrirNovoUsuario()}
          >
            <Plus className="w-4 h-4" /> Novo acesso (admin/aluno)
          </Button>
        </div>

        {/* Lista de academias — mobile: cards */}
        <div className="md:hidden space-y-3">
          {academias.map((academia) => (
            <div key={academia.id} className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() => setAcademiaParaVerUsuarios({ id: academia.id, nome: academia.nome })}
                  className="font-medium text-gray-900 text-left hover:text-red-600 break-words min-w-0"
                >
                  {academia.nome}
                </button>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    academia.ativa ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {academia.ativa ? 'Ativa' : 'Suspensa'}
                </span>
              </div>

              <div className="flex gap-4 text-sm text-gray-500">
                <span>Admins: <strong className="text-gray-700">{academia.totalAdmins ?? '-'}</strong></span>
                <span>Alunos: <strong className="text-gray-700">{academia.totalAlunos ?? '-'}</strong></span>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={() => setAcademiaParaEditar(academia.id)}
                  className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Editar
                </button>
                <button
                  onClick={() => abrirNovoUsuario(academia.id)}
                  className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
                >
                  + Acesso
                </button>
                <button
                  onClick={() => handleAlternarStatus(academia.id, academia.ativa)}
                  disabled={alterandoStatus === academia.id}
                  className="px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  {alterandoStatus === academia.id
                    ? 'Salvando...'
                    : academia.ativa ? 'Suspender' : 'Reativar'}
                </button>
              </div>
            </div>
          ))}

          {academias.length === 0 && !loading && (
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-8 text-center text-gray-400 text-sm">
              Nenhuma academia cadastrada ainda.
            </div>
          )}
        </div>

        {/* Lista de academias — desktop: tabela */}
        <div className="hidden md:block bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Academia</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Admins</th>
                <th className="px-4 py-3 font-medium">Alunos</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {academias.map((academia) => (
                <tr key={academia.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <button
                      onClick={() => setAcademiaParaVerUsuarios({ id: academia.id, nome: academia.nome })}
                      className="hover:underline hover:text-red-600 text-left"
                    >
                      {academia.nome}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        academia.ativa ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {academia.ativa ? 'Ativa' : 'Suspensa'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{academia.totalAdmins ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{academia.totalAlunos ?? '-'}</td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      onClick={() => setAcademiaParaEditar(academia.id)}
                      className="text-sm text-gray-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => abrirNovoUsuario(academia.id)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      + Acesso
                    </button>
                    <button
                      onClick={() => handleAlternarStatus(academia.id, academia.ativa)}
                      disabled={alterandoStatus === academia.id}
                      className="text-sm text-gray-600 hover:underline disabled:opacity-50"
                    >
                      {alterandoStatus === academia.id
                        ? 'Salvando...'
                        : academia.ativa ? 'Suspender' : 'Reativar'}
                    </button>
                  </td>
                </tr>
              ))}

              {academias.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Nenhuma academia cadastrada ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      <CreateAcademyModal
        isOpen={modalAcademiaAberto}
        onClose={() => setModalAcademiaAberto(false)}
        onCreate={criarAcademia}
      />

      <EditAcademyModal
        isOpen={!!academiaParaEditar}
        onClose={() => setAcademiaParaEditar(null)}
        academyId={academiaParaEditar}
        onLoad={obterAcademia}
        onSave={atualizarAcademia}
      />

      <AcademyUsersModal
        isOpen={!!academiaParaVerUsuarios}
        onClose={() => setAcademiaParaVerUsuarios(null)}
        academyId={academiaParaVerUsuarios?.id ?? null}
        academyName={academiaParaVerUsuarios?.nome}
        onList={listarUsuariosDaAcademia}
        onUpdate={atualizarUsuario}
        onDelete={removerUsuario}
      />

      <CreateUserModal
        isOpen={modalUsuarioAberto}
        onClose={() => setModalUsuarioAberto(false)}
        academias={academias}
        academiaPreSelecionada={academiaParaNovoUsuario}
        onCreate={criarUsuario}
      />
    </div>
  );
}