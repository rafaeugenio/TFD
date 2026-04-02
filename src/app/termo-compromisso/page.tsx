'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  FileSignature,
  Search,
  ChevronLeft,
  ChevronRight,
  Check,
  Eye,
  Upload,
  X,
  ClipboardCheck,
  Clock,
  Paperclip,
  AlertTriangle,
  FileText,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { formatCPF, maskCPF } from '@/shared/pipes/formatters';
import { MOCK_TERMOS } from '@/core/mocks/termo-compromisso.mock';
import {
  CLAUSULAS_TERMO,
  PARENTESCO_OPTIONS,
  type TermoCompromisso,
  type StatusTermo,
  type ModalidadeAceite,
  type GrauParentesco,
} from '@/core/models/termo-compromisso.model';

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  if (!iso) return '\u2014';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

function formatDateTime(iso: string): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  const datePart = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
  const timePart = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  });
  return `${datePart} ${timePart}`;
}

function todayFormatted(): string {
  return new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

const ITEMS_PER_PAGE = 8;

/* -------------------------------------------------- */
/*  Status tag for Termo                               */
/* -------------------------------------------------- */

function TermoStatusTag({ status }: { status: StatusTermo }) {
  const config: Record<StatusTermo, { bg: string; text: string; label: string }> = {
    PENDENTE: { bg: '#FFF7ED', text: '#C2410C', label: 'Pendente' },
    REGISTRADO: { bg: '#DCFCE7', text: '#15803D', label: 'Registrado' },
  };
  const { bg, text, label } = config[status];
  return (
    <span
      className="tfd-tag tfd-tag--rounded tfd-tag--dot"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function TermoCompromissoPage() {
  const toast = useToast();

  /* ── List state ── */
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');

  /* ── Mock data (will be replaced by useSupabaseData when table exists) ── */
  const [termos, setTermos] = useState<TermoCompromisso[]>(MOCK_TERMOS);

  const filtered = useMemo(() => {
    let result = termos;
    if (statusFilter !== 'TODOS') {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.numeroProcesso.toLowerCase().includes(q) ||
          t.pacienteNome.toLowerCase().includes(q) ||
          t.pacienteCpf.replace(/\D/g, '').includes(q.replace(/\D/g, '')),
      );
    }
    return result;
  }, [termos, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  /* ── KPI counts ── */
  const pendingCount = termos.filter((t) => t.status === 'PENDENTE').length;
  const registeredCount = termos.filter((t) => t.status === 'REGISTRADO').length;

  /* ── Drawer state ── */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTermo, setSelectedTermo] = useState<TermoCompromisso | null>(null);
  const [isViewMode, setIsViewMode] = useState(false);

  /* ── Form state ── */
  const [modalidade, setModalidade] = useState<ModalidadeAceite>('ACEITE_PRESENCIAL');
  const [responsavelNome, setResponsavelNome] = useState('');
  const [responsavelCpf, setResponsavelCpf] = useState('');
  const [responsavelParentesco, setResponsavelParentesco] = useState<GrauParentesco | ''>('');
  const [confirmacaoLeitura, setConfirmacaoLeitura] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  /* ── Drawer helpers ── */

  function resetForm() {
    setModalidade('ACEITE_PRESENCIAL');
    setResponsavelNome('');
    setResponsavelCpf('');
    setResponsavelParentesco('');
    setConfirmacaoLeitura(false);
    setUploadFile(null);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setSelectedTermo(null);
    setIsViewMode(false);
    resetForm();
  }

  function handleOpenRegistrar(termo: TermoCompromisso) {
    setSelectedTermo(termo);
    setIsViewMode(termo.status === 'REGISTRADO');
    if (termo.status === 'REGISTRADO') {
      setModalidade(termo.modalidadeAceite ?? 'ACEITE_PRESENCIAL');
      setResponsavelNome(termo.responsavelNome ?? '');
      setResponsavelCpf(termo.responsavelCpf ?? '');
      setResponsavelParentesco(termo.responsavelParentesco ?? '');
      setConfirmacaoLeitura(termo.confirmacaoLeitura ?? false);
    } else {
      resetForm();
    }
    setDrawerOpen(true);
  }

  /* ── Validação de CPF simples (formato + dígitos) ── */

  function validarCpfFormato(cpf: string): boolean {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) soma += Number(digits[i]) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    if (resto !== Number(digits[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) soma += Number(digits[i]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10) resto = 0;
    return resto === Number(digits[10]);
  }

  /* ── Submit: registrar aceite ── */

  function handleRegistrarAceite() {
    if (!selectedTermo) return;

    // Validações
    if (modalidade === 'ACEITE_PRESENCIAL') {
      if (!confirmacaoLeitura) {
        toast.warning('Confirmação obrigatória', 'Marque a confirmação de que o paciente/responsável leu e concordou com os termos.');
        return;
      }
    }

    if (modalidade === 'UPLOAD_ASSINADO') {
      if (!uploadFile) {
        toast.warning('Arquivo obrigatório', 'Faça upload do termo assinado digitalizado.');
        return;
      }
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(uploadFile.type)) {
        toast.warning('Formato inválido', 'Formatos aceitos: PDF, JPG, PNG.');
        return;
      }
      if (uploadFile.size > 10 * 1024 * 1024) {
        toast.warning('Arquivo muito grande', 'O tamanho máximo é 10 MB.');
        return;
      }
    }

    // Validação de responsável (campos condicionais)
    if (responsavelNome || responsavelCpf || responsavelParentesco) {
      if (!responsavelNome.trim()) {
        toast.warning('Campo obrigatório', 'Preencha o nome do responsável.');
        return;
      }
      if (!responsavelCpf.trim() || !validarCpfFormato(responsavelCpf)) {
        toast.warning('CPF inválido', 'Informe um CPF válido para o responsável.');
        return;
      }
      if (!responsavelParentesco) {
        toast.warning('Campo obrigatório', 'Selecione o grau de parentesco.');
        return;
      }
    }

    // Simular registro (mock)
    const now = new Date().toISOString();
    const updated: TermoCompromisso = {
      ...selectedTermo,
      status: 'REGISTRADO',
      modalidadeAceite: modalidade,
      confirmacaoLeitura: modalidade === 'ACEITE_PRESENCIAL' ? confirmacaoLeitura : undefined,
      responsavelNome: responsavelNome || undefined,
      responsavelCpf: responsavelCpf || undefined,
      responsavelParentesco: (responsavelParentesco as GrauParentesco) || undefined,
      arquivoNome: uploadFile?.name,
      arquivoUrl: uploadFile ? URL.createObjectURL(uploadFile) : undefined,
      dataRegistro: now,
      registradoPor: 'Maria Silva',
    };

    setTermos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    toast.success('Termo registrado!', 'O Termo de Compromisso foi registrado com sucesso.');
    handleCloseDrawer();
  }

  /* ── Gerar PDF para impressão (simulado) ── */

  function handleGerarPdf() {
    toast.info('PDF gerado', 'O PDF do Termo de Compromisso foi gerado para impressão.');
  }

  return (
    <>
      <PageHeader
        title="Termo de Compromisso"
        subtitle="Gestão dos termos de compromisso dos processos TFD"
      />

      {/* ========== KPI Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}
          >
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Pendentes</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{pendingCount}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
          >
            <ClipboardCheck size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Registrados</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{registeredCount}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}
          >
            <FileSignature size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{termos.length}</p>
          </div>
        </div>
      </div>

      {/* ========== Toolbar ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="tfd-input-leading-icon"
              style={{ color: 'var(--tfd-text-muted)' }}
            />
            <input
              type="text"
              className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
              placeholder="Buscar por paciente, CPF ou nº processo..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            />
          </div>

          <select
            className="tfd-input tfd-input--sm"
            style={{ width: 'auto', minWidth: 140 }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
          >
            <option value="TODOS">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="REGISTRADO">Registrado</option>
          </select>
        </div>

        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
          {filtered.length} termo{filtered.length !== 1 && 's'}
        </p>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Nº Processo</th>
                <th>Paciente</th>
                <th className="hidden md:table-cell">CPF</th>
                <th>Status do Termo</th>
                <th className="hidden md:table-cell">Data Registro</th>
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Check size={32} style={{ color: 'var(--tfd-status-success)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum termo encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((termo) => (
                  <tr
                    key={termo.id}
                    className="cursor-pointer"
                    onClick={() => handleOpenRegistrar(termo)}
                  >
                    <td>
                      <span
                        className="font-medium"
                        style={{ color: 'var(--tfd-primary-500)' }}
                      >
                        {termo.numeroProcesso}
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate font-medium">
                      {termo.pacienteNome}
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {formatCPF(termo.pacienteCpf)}
                    </td>
                    <td>
                      <TermoStatusTag status={termo.status} />
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {termo.dataRegistro ? formatDateTime(termo.dataRegistro) : '\u2014'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                          title={termo.status === 'PENDENTE' ? 'Registrar termo' : 'Visualizar termo'}
                          onClick={(e) => { e.stopPropagation(); handleOpenRegistrar(termo); }}
                        >
                          {termo.status === 'PENDENTE' ? <FileSignature size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== Drawer: Registrar / Visualizar Termo ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={isViewMode ? 'Termo de Compromisso' : 'Registrar Termo de Compromisso'}
        subtitle={selectedTermo ? `${selectedTermo.numeroProcesso} \u2014 ${selectedTermo.pacienteNome}` : ''}
        width="580px"
        footer={
          isViewMode ? (
            <>
              <button className="tfd-btn tfd-btn-secondary" onClick={handleGerarPdf}>
                <FileText size={16} />
                Gerar PDF para Impressão
              </button>
            </>
          ) : (
            <>
              <button className="tfd-btn tfd-btn-secondary" onClick={handleGerarPdf}>
                <FileText size={16} />
                Gerar PDF
              </button>
              <button className="tfd-btn tfd-btn-primary" onClick={handleRegistrarAceite}>
                <Check size={16} />
                Registrar Aceite
              </button>
            </>
          )
        }
      >
        {selectedTermo && (
          <>
            {/* ── Dados do Paciente (read-only) ── */}
            <div
              className="p-3 rounded-lg mb-4"
              style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>
                  Dados do Paciente
                </h4>
                <TermoStatusTag status={selectedTermo.status} />
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>Nome: </span>
                  <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{selectedTermo.pacienteNome}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>CPF: </span>
                  <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{formatCPF(selectedTermo.pacienteCpf)}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>RG: </span>
                  <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{selectedTermo.pacienteRg || '\u2014'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>CNS: </span>
                  <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{selectedTermo.pacienteCns || '\u2014'}</span>
                </div>
                <div className="col-span-2">
                  <span style={{ color: 'var(--tfd-text-muted)' }}>Endereço: </span>
                  <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{selectedTermo.pacienteEndereco || '\u2014'}</span>
                </div>
              </div>
            </div>

            {/* ── Texto introdutório ── */}
            <div className="mb-4">
              <p className="text-sm leading-relaxed" style={{ color: 'var(--tfd-text-primary)' }}>
                Eu, <strong>{selectedTermo.pacienteNome}</strong>, portador(a) do CPF{' '}
                <strong>{formatCPF(selectedTermo.pacienteCpf)}</strong>
                {selectedTermo.pacienteRg && (
                  <> e RG <strong>{selectedTermo.pacienteRg}</strong></>
                )}
                , assumo voluntariamente estar ciente de todas as informações prestadas neste termo:
              </p>
            </div>

            {/* ── 17 Cláusulas (área scrollável) ── */}
            <div
              className="rounded-lg p-4 mb-4 overflow-y-auto"
              style={{
                maxHeight: 280,
                backgroundColor: 'var(--tfd-surface-50)',
                border: '1px solid var(--tfd-surface-border)',
              }}
            >
              <ol className="list-decimal list-outside pl-5 space-y-2.5">
                {CLAUSULAS_TERMO.map((clausula, idx) => (
                  <li
                    key={idx}
                    className="text-[13px] leading-relaxed"
                    style={{ color: 'var(--tfd-text-primary)' }}
                  >
                    {clausula}
                  </li>
                ))}
              </ol>
            </div>

            {/* ── Local e Data ── */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--tfd-text-muted)' }}>Local</p>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {selectedTermo.pacienteMunicipio || 'São Luís'}, MA
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--tfd-text-muted)' }}>Data</p>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {isViewMode && selectedTermo.dataRegistro
                    ? formatDate(selectedTermo.dataRegistro)
                    : todayFormatted()}
                </p>
              </div>
            </div>

            <hr className="tfd-divider" />

            {/* ── Modalidade de aceite ── */}
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              Modalidade de aceite
            </h3>

            <div className="space-y-2 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="modalidade"
                  value="ACEITE_PRESENCIAL"
                  checked={modalidade === 'ACEITE_PRESENCIAL'}
                  onChange={() => setModalidade('ACEITE_PRESENCIAL')}
                  disabled={isViewMode}
                  className="accent-[var(--tfd-primary-500)]"
                />
                <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                  Aceite presencial registrado pelo atendente
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="modalidade"
                  value="UPLOAD_ASSINADO"
                  checked={modalidade === 'UPLOAD_ASSINADO'}
                  onChange={() => setModalidade('UPLOAD_ASSINADO')}
                  disabled={isViewMode}
                  className="accent-[var(--tfd-primary-500)]"
                />
                <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                  Upload de termo assinado
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                <input
                  type="radio"
                  name="modalidade"
                  value="ASSINATURA_DIGITAL"
                  disabled
                  className="accent-[var(--tfd-primary-500)]"
                />
                <span className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                  Assinatura digital (em breve)
                </span>
              </label>
            </div>

            {/* ── Aceite Presencial: campos ── */}
            {modalidade === 'ACEITE_PRESENCIAL' && (
              <>
                {/* Dados do responsável (quando menor/incapaz) */}
                <div
                  className="p-3 rounded-lg mb-4"
                  style={{ backgroundColor: '#FFFBEB', border: '1px solid #FDE68A' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} style={{ color: '#92400E' }} />
                    <span className="text-xs font-semibold" style={{ color: '#92400E' }}>
                      Responsável (preencher se paciente menor de idade ou incapaz)
                    </span>
                  </div>

                  <div className="space-y-3">
                    <FormField label="Nome do responsável">
                      <input
                        type="text"
                        className="tfd-input"
                        placeholder="Nome completo do responsável"
                        value={responsavelNome}
                        onChange={(e) => setResponsavelNome(e.target.value)}
                        disabled={isViewMode}
                        maxLength={150}
                      />
                    </FormField>

                    <FormField label="CPF do responsável">
                      <input
                        type="text"
                        className="tfd-input"
                        placeholder="000.000.000-00"
                        value={responsavelCpf}
                        onChange={(e) => setResponsavelCpf(maskCPF(e.target.value))}
                        disabled={isViewMode}
                      />
                    </FormField>

                    <FormField label="Grau de parentesco">
                      <select
                        className="tfd-input"
                        value={responsavelParentesco}
                        onChange={(e) => setResponsavelParentesco(e.target.value as GrauParentesco)}
                        disabled={isViewMode}
                      >
                        <option value="">Selecione...</option>
                        {PARENTESCO_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </FormField>
                  </div>
                </div>

                {/* Checkbox de confirmação */}
                {!isViewMode && (
                  <label className="flex items-start gap-2 mb-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmacaoLeitura}
                      onChange={(e) => setConfirmacaoLeitura(e.target.checked)}
                      className="mt-0.5 accent-[var(--tfd-primary-500)]"
                    />
                    <span className="text-sm leading-snug" style={{ color: 'var(--tfd-text-primary)' }}>
                      Confirmo que o paciente/responsável leu e concordou com todos os termos acima
                    </span>
                  </label>
                )}

                {isViewMode && selectedTermo.confirmacaoLeitura && (
                  <div className="flex items-center gap-2 mb-4 p-2 rounded-lg" style={{ backgroundColor: '#DCFCE7' }}>
                    <Check size={14} style={{ color: '#15803D' }} />
                    <span className="text-xs font-medium" style={{ color: '#15803D' }}>
                      Leitura e concordância confirmadas pelo atendente
                    </span>
                  </div>
                )}
              </>
            )}

            {/* ── Upload de termo assinado ── */}
            {modalidade === 'UPLOAD_ASSINADO' && (
              <>
                {!isViewMode ? (
                  <div className="mb-4">
                    <label
                      className="flex items-center justify-center gap-2 px-4 py-4 rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:border-[var(--tfd-primary-300)] hover:bg-[var(--tfd-primary-50)]"
                      style={{ borderColor: 'var(--tfd-surface-border)' }}
                    >
                      <Upload size={18} style={{ color: 'var(--tfd-primary-500)' }} />
                      <span className="text-sm font-medium" style={{ color: 'var(--tfd-primary-600)' }}>
                        Clique para selecionar o termo assinado
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0] ?? null;
                          setUploadFile(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                      PDF, JPG, PNG — máximo 10 MB
                    </p>

                    {uploadFile && (
                      <div
                        className="flex items-center gap-3 p-2.5 rounded-lg mt-2"
                        style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
                      >
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                          style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                        >
                          <Paperclip size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                            {uploadFile.name}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                            {(uploadFile.size / 1024).toFixed(0)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          className="tfd-btn tfd-btn-ghost tfd-btn--icon-only shrink-0"
                          title="Remover arquivo"
                          onClick={() => setUploadFile(null)}
                        >
                          <X size={14} style={{ color: 'var(--tfd-status-danger)' }} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Visualização do arquivo uploadado */
                  selectedTermo.arquivoNome && (
                    <div
                      className="flex items-center gap-3 p-2.5 rounded-lg mb-4"
                      style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
                    >
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                        style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
                      >
                        <Paperclip size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                          {selectedTermo.arquivoNome}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                          Documento digitalizado
                        </p>
                      </div>
                    </div>
                  )
                )}
              </>
            )}

            {/* ── Informações de registro (view mode) ── */}
            {isViewMode && selectedTermo.dataRegistro && (
              <>
                <hr className="tfd-divider" />
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
                >
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tfd-text-muted)' }}>
                    Informações do Registro
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <div>
                      <span style={{ color: 'var(--tfd-text-muted)' }}>Modalidade: </span>
                      <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                        {selectedTermo.modalidadeAceite === 'ACEITE_PRESENCIAL' ? 'Aceite presencial' : 'Upload de scan'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--tfd-text-muted)' }}>Registrado por: </span>
                      <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                        {selectedTermo.registradoPor || '\u2014'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span style={{ color: 'var(--tfd-text-muted)' }}>Data/hora: </span>
                      <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                        {formatDateTime(selectedTermo.dataRegistro)}
                      </span>
                    </div>
                    {selectedTermo.responsavelNome && (
                      <>
                        <div>
                          <span style={{ color: 'var(--tfd-text-muted)' }}>Responsável: </span>
                          <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                            {selectedTermo.responsavelNome}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--tfd-text-muted)' }}>CPF resp.: </span>
                          <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                            {formatCPF(selectedTermo.responsavelCpf ?? '')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
