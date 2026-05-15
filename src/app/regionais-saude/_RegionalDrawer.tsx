'use client';

import { useEffect, useMemo, useState } from 'react';
import { Building2, Loader2, Mail, Phone, Search } from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import ConfirmDialog, { buildDiff, type DiffField } from '@/shared/components/confirm-dialog/ConfirmDialog';
import { useToast } from '@/shared/components/toast/Toast';
import { maskPhone } from '@/shared/pipes/formatters';
import {
  buscarRegionalSaude,
  criarRegionalSaude,
  atualizarRegionalSaude,
  listarMunicipiosPorRegional,
  atualizarMunicipiosRegional,
} from '@/services/regionais-saude.service';
import { listarRegioes } from '@/services/regioes.service';
import type { Regiao } from '@/core/models/regiao.model';

interface IbgeMunicipio {
  id: number;
  nome: string;
}

export interface RegionalDrawerProps {
  open: boolean;
  /** Quando informado, drawer entra em modo edição. */
  editandoId?: string | null;
  /** Snapshot direto (evita fetch quando a página chamadora já tem a row). */
  editandoData?: Record<string, unknown> | null;
  onClose: () => void;
  /** Chamado após salvar com sucesso. Recebe o ID da regional salva. */
  onSaved?: (id: string) => void;
}

/**
 * Drawer de cadastro/edição de Regional de Saúde.
 *
 * Componente self-contained com todo o state local — pode ser montado em
 * qualquer tela (listagem, detalhe, etc.) sem trocar de rota.
 */
export default function RegionalDrawer({
  open,
  editandoId,
  editandoData,
  onClose,
  onSaved,
}: RegionalDrawerProps) {
  const toast = useToast();

  /* ---- Form: Identificação ---- */
  const [codigo, setCodigo] = useState('');
  const [nome, setNome] = useState('');
  const [municipioSede, setMunicipioSede] = useState('');

  /* ---- Form: Endereço ---- */
  const [logradouro, setLogradouro] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('');

  /* ---- Form: Contato ---- */
  const [telefone, setTelefone] = useState('');
  const [telefone2, setTelefone2] = useState('');
  const [email, setEmail] = useState('');
  const [email2, setEmail2] = useState('');

  /* ---- Form: Região ---- */
  const [regiaoId, setRegiaoId] = useState<string>('');
  const [regioes, setRegioes] = useState<Regiao[]>([]);

  /* ---- Form: Municípios ---- */
  const [municipioSearch, setMunicipioSearch] = useState('');
  const [allMunicipiosMA, setAllMunicipiosMA] = useState<string[]>([]);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [selectedMunicipios, setSelectedMunicipios] = useState<Set<string>>(new Set());

  /* ---- Confirmação ---- */
  const [editingSnapshot, setEditingSnapshot] = useState<Record<string, string> | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<{ tone: 'create' | 'edit'; diff: DiffField[] } | null>(null);
  const [saving, setSaving] = useState(false);

  /* -------- Carregar regiões (uma vez) -------- */
  useEffect(() => {
    listarRegioes().then(({ data }) => {
      if (data) setRegioes(data as Regiao[]);
    });
  }, []);

  /* -------- Carregar municípios do MA via IBGE ao abrir -------- */
  useEffect(() => {
    if (!open || allMunicipiosMA.length > 0) return;
    setLoadingMunicipios(true);
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/MA/municipios?orderBy=nome')
      .then((r) => r.json())
      .then((data: IbgeMunicipio[]) => {
        setAllMunicipiosMA(data.map((m) => m.nome));
      })
      .catch(() => {
        toast.error('Erro ao carregar municípios', 'Não foi possível carregar a lista do IBGE.');
      })
      .finally(() => setLoadingMunicipios(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* -------- Carregar dados quando abrir em modo edição -------- */
  useEffect(() => {
    if (!open) return;
    if (!editandoId) {
      // modo create — reset e sai
      resetForm();
      setEditingSnapshot(null);
      return;
    }
    // modo edit
    (async () => {
      let reg = editandoData;
      if (!reg) {
        const { data } = await buscarRegionalSaude(editandoId);
        reg = (data as Record<string, unknown> | null) ?? null;
      }
      if (!reg) return;
      hydrateFromRow(reg, editandoId);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editandoId, editandoData]);

  function resetForm() {
    setCodigo('');
    setNome('');
    setMunicipioSede('');
    setLogradouro('');
    setBairro('');
    setMunicipio('');
    setTelefone('');
    setTelefone2('');
    setEmail('');
    setEmail2('');
    setRegiaoId('');
    setMunicipioSearch('');
    setSelectedMunicipios(new Set());
  }

  async function hydrateFromRow(reg: Record<string, unknown>, id: string) {
    setEditingSnapshot({
      codigo: (reg.codigo as string) ?? '',
      nome: (reg.nome as string) ?? '',
      municipioSede: (reg.municipio_sede as string) ?? '',
      logradouro: (reg.logradouro as string) ?? '',
      bairro: (reg.bairro as string) ?? '',
      municipio: (reg.municipio as string) ?? '',
      telefone: (reg.telefone as string) ?? '',
      telefone2: (reg.telefone2 as string) ?? '',
      email: (reg.email as string) ?? '',
      email2: (reg.email2 as string) ?? '',
      regiaoId: (reg.regiao_id as string) ?? '',
    });
    setCodigo((reg.codigo as string) ?? '');
    setNome((reg.nome as string) ?? '');
    setMunicipioSede((reg.municipio_sede as string) ?? '');
    setLogradouro((reg.logradouro as string) ?? '');
    setBairro((reg.bairro as string) ?? '');
    setMunicipio((reg.municipio as string) ?? '');
    setTelefone(maskPhone((reg.telefone as string) ?? ''));
    setTelefone2(maskPhone((reg.telefone2 as string) ?? ''));
    setEmail((reg.email as string) ?? '');
    setEmail2((reg.email2 as string) ?? '');
    setRegiaoId((reg.regiao_id as string) ?? '');

    const { data: munRows } = await listarMunicipiosPorRegional(id);
    if (munRows) {
      setSelectedMunicipios(
        new Set((munRows as { municipio_nome: string }[]).map((r) => r.municipio_nome)),
      );
    }
  }

  function handleClose() {
    onClose();
    // Reset apenas após o drawer fechar para evitar flicker durante a transição.
    setTimeout(() => {
      resetForm();
      setEditingSnapshot(null);
    }, 250);
  }

  /* -------- Multi-select municípios -------- */
  function toggleMunicipio(nome: string) {
    setSelectedMunicipios((prev) => {
      const next = new Set(prev);
      if (next.has(nome)) next.delete(nome);
      else next.add(nome);
      return next;
    });
  }

  const filteredMunicipios = useMemo(
    () =>
      municipioSearch.trim()
        ? allMunicipiosMA.filter((m) => m.toLowerCase().includes(municipioSearch.toLowerCase()))
        : allMunicipiosMA,
    [allMunicipiosMA, municipioSearch],
  );

  /* -------- Submit -------- */
  function handleRequestSubmit() {
    if (!codigo.trim()) { toast.error('Campo obrigatório', 'Informe o código da regional (ex: URS I).'); return; }
    if (!nome.trim()) { toast.error('Campo obrigatório', 'Informe o nome da regional.'); return; }

    const enderecoCompleto = [logradouro.trim(), bairro.trim(), municipio.trim()].filter(Boolean).join(', ');
    const regiaoNomeFromId = (id: string) => regioes.find((r) => r.id === id)?.nome ?? '';

    if (editandoId && editingSnapshot) {
      const before = {
        codigo: editingSnapshot.codigo,
        nome: editingSnapshot.nome,
        municipioSede: editingSnapshot.municipioSede,
        endereco: [editingSnapshot.logradouro, editingSnapshot.bairro, editingSnapshot.municipio].filter(Boolean).join(', '),
        telefone: editingSnapshot.telefone ? maskPhone(editingSnapshot.telefone) : '',
        telefone2: editingSnapshot.telefone2 ? maskPhone(editingSnapshot.telefone2) : '',
        email: editingSnapshot.email,
        email2: editingSnapshot.email2,
        regiao: regiaoNomeFromId(editingSnapshot.regiaoId),
      };
      const after = {
        codigo: codigo.trim().toUpperCase(),
        nome: nome.trim(),
        municipioSede: municipioSede.trim(),
        endereco: enderecoCompleto,
        telefone,
        telefone2,
        email: email.trim(),
        email2: email2.trim(),
        regiao: regiaoNomeFromId(regiaoId),
      };
      const diff = buildDiff(before, after, [
        { key: 'codigo', label: 'Código' },
        { key: 'nome', label: 'Nome' },
        { key: 'municipioSede', label: 'Município sede' },
        { key: 'regiao', label: 'Região' },
        { key: 'endereco', label: 'Endereço' },
        { key: 'telefone', label: 'Telefone 1' },
        { key: 'telefone2', label: 'Telefone 2' },
        { key: 'email', label: 'E-mail' },
        { key: 'email2', label: 'E-mail 2' },
      ]);
      setSaveConfirm({ tone: 'edit', diff });
    } else {
      setSaveConfirm({
        tone: 'create',
        diff: [
          { label: 'Código', after: codigo.trim().toUpperCase() },
          { label: 'Nome', after: nome.trim() },
          { label: 'Município sede', after: municipioSede.trim() },
          { label: 'Região', after: regiaoNomeFromId(regiaoId) },
          { label: 'Endereço', after: enderecoCompleto },
          { label: 'Telefone', after: telefone },
          { label: 'E-mail', after: email.trim() },
        ],
      });
    }
  }

  async function handleSubmit() {
    const cleanTel = telefone.replace(/\D/g, '');
    const cleanTel2 = telefone2.replace(/\D/g, '');

    const payload = {
      codigo: codigo.trim().toUpperCase(),
      nome: nome.trim(),
      municipio_sede: municipioSede.trim() || null,
      logradouro: logradouro.trim() || null,
      bairro: bairro.trim() || null,
      municipio: municipio.trim() || null,
      uf: 'MA',
      telefone: cleanTel || null,
      telefone2: cleanTel2 || null,
      email: email.trim() || null,
      email2: email2.trim() || null,
      regiao_id: regiaoId || null,
      ativo: true,
    } as Parameters<typeof criarRegionalSaude>[0];

    let savedId = editandoId ?? null;

    if (editandoId) {
      const result = await atualizarRegionalSaude(editandoId, payload);
      if (result.error) {
        toast.error('Erro ao atualizar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
    } else {
      const result = await criarRegionalSaude(payload);
      if (result.error) {
        toast.error('Erro ao cadastrar', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
      savedId = (result.data as { id: string } | null)?.id ?? null;
    }

    if (savedId) {
      await atualizarMunicipiosRegional(savedId, Array.from(selectedMunicipios));
    }

    toast.success(
      editandoId ? 'Regional atualizada!' : 'Regional cadastrada!',
      editandoId ? 'Os dados foram atualizados com sucesso.' : 'A regional foi cadastrada com sucesso.',
    );
    if (savedId && onSaved) onSaved(savedId);
    handleClose();
  }

  return (
    <>
      {/* Save Confirmation Modal */}
      <ConfirmDialog
        open={!!saveConfirm}
        tone={saveConfirm?.tone ?? 'create'}
        title={editandoId ? 'Confirmar alterações na regional?' : 'Confirmar cadastro de regional?'}
        subject={nome.trim() ? `${codigo.toUpperCase()} — ${nome.trim()}` : undefined}
        diff={saveConfirm?.diff}
        busy={saving}
        onClose={() => setSaveConfirm(null)}
        onConfirm={async () => {
          setSaving(true);
          try {
            await handleSubmit();
            setSaveConfirm(null);
          } finally {
            setSaving(false);
          }
        }}
      />

      <Drawer
        open={open}
        onClose={handleClose}
        title={editandoId ? 'Editar Regional' : 'Nova Regional'}
        subtitle={editandoId ? 'Atualize os dados da regional de saúde' : 'Preencha os dados para cadastrar uma nova regional'}
        width="680px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleClose}>Cancelar</button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleRequestSubmit} disabled={saving}>
              {editandoId ? 'Salvar Alterações' : 'Cadastrar Regional'}
            </button>
          </>
        }
      >
        {/* ── Identificação ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Identificação
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Código" required>
            <input
              type="text"
              className="tfd-input"
              placeholder="Ex: URS I"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
            />
          </FormField>

          <FormField label="Nome" required>
            <input
              type="text"
              className="tfd-input"
              placeholder="Ex: Rosário"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Município Sede">
            <select
              className="tfd-input"
              value={municipioSede}
              onChange={(e) => setMunicipioSede(e.target.value)}
              disabled={loadingMunicipios}
            >
              <option value="">
                {loadingMunicipios ? 'Carregando municípios...' : 'Selecione o município...'}
              </option>
              {allMunicipiosMA.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Região">
            <select
              className="tfd-input"
              value={regiaoId}
              onChange={(e) => setRegiaoId(e.target.value)}
            >
              <option value="">Sem região definida</option>
              {regioes.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
            <p className="text-[11px] mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
              Agrupamento geográfico da regional (configurável em Sistema › Configurações).
            </p>
          </FormField>
        </div>

        <hr className="tfd-divider" />

        {/* ── Endereço do escritório ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Endereço do Escritório
        </h3>

        <FormField label="Logradouro">
          <input
            type="text"
            className="tfd-input"
            value={logradouro}
            onChange={(e) => setLogradouro(e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Bairro">
            <input
              type="text"
              className="tfd-input"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
            />
          </FormField>

          <FormField label="Município">
            <input
              type="text"
              className="tfd-input"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
            />
          </FormField>
        </div>

        <hr className="tfd-divider" />

        {/* ── Contato ── */}
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2" style={{ color: 'var(--tfd-text-primary)' }}>
          <Phone size={14} /> Contato
        </h3>
        <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
          Informe até dois telefones e dois e-mails (institucional e secundário).
        </p>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Telefone 1">
            <input
              type="tel"
              className="tfd-input"
              placeholder="(99) 99999-0000"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
            />
          </FormField>

          <FormField label="Telefone 2">
            <input
              type="tel"
              className="tfd-input"
              placeholder="(99) 99999-0000"
              value={telefone2}
              onChange={(e) => setTelefone2(maskPhone(e.target.value))}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="E-mail Institucional">
            <div className="relative">
              <Mail size={14} className="tfd-input-leading-icon" style={{ color: 'var(--tfd-text-muted)' }} />
              <input
                type="email"
                className="tfd-input tfd-input--with-leading-icon"
                placeholder="urs.xxx@saude.ma.gov.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </FormField>

          <FormField label="E-mail Secundário">
            <div className="relative">
              <Mail size={14} className="tfd-input-leading-icon" style={{ color: 'var(--tfd-text-muted)' }} />
              <input
                type="email"
                className="tfd-input tfd-input--with-leading-icon"
                placeholder="urs.xxx@gmail.com"
                value={email2}
                onChange={(e) => setEmail2(e.target.value)}
              />
            </div>
          </FormField>
        </div>

        <hr className="tfd-divider" />

        {/* ── Municípios ── */}
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--tfd-text-primary)' }}>
            <Building2 size={14} /> Municípios da Regional
          </h3>
          {selectedMunicipios.size > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
            >
              {selectedMunicipios.size} selecionado{selectedMunicipios.size !== 1 && 's'}
            </span>
          )}
        </div>
        <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
          Selecione os municípios que pertencem a esta regional. Você pode adicionar ou remover a qualquer momento.
        </p>

        <div className="relative mb-2">
          <Search size={14} className="tfd-input-leading-icon" style={{ color: 'var(--tfd-text-muted)' }} />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Filtrar municípios..."
            value={municipioSearch}
            onChange={(e) => setMunicipioSearch(e.target.value)}
          />
        </div>

        <div
          className="rounded-lg overflow-y-auto"
          style={{
            maxHeight: '240px',
            border: '1px solid var(--tfd-surface-border)',
            backgroundColor: 'var(--tfd-surface-card)',
          }}
        >
          {loadingMunicipios ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
              <span className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando municípios...</span>
            </div>
          ) : filteredMunicipios.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhum município encontrado.</p>
            </div>
          ) : (
            <ul>
              {filteredMunicipios.map((mun) => {
                const checked = selectedMunicipios.has(mun);
                return (
                  <li key={mun}>
                    <label
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors duration-100"
                      style={{
                        borderBottom: '1px solid var(--tfd-surface-border)',
                        backgroundColor: checked ? 'var(--tfd-primary-50)' : undefined,
                      }}
                      onMouseEnter={(e) => { if (!checked) e.currentTarget.style.backgroundColor = 'var(--tfd-surface-hover, #F5F7FA)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = checked ? 'var(--tfd-primary-50)' : ''; }}
                    >
                      <input
                        type="checkbox"
                        className="shrink-0"
                        checked={checked}
                        onChange={() => toggleMunicipio(mun)}
                        style={{ accentColor: 'var(--tfd-primary-500)' }}
                      />
                      <span
                        className="text-sm"
                        style={{ color: checked ? 'var(--tfd-primary-500)' : 'var(--tfd-text-primary)' }}
                      >
                        {mun}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Drawer>
    </>
  );
}
