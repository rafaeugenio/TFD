'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Loader2,
  Search,
  Package,
  Power,
} from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import Pagination from '@/shared/components/pagination/Pagination';
import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';
import {
  listarMedicosAdmin,
  criarMedico,
  atualizarMedico,
  desativarMedico,
} from '@/services/medicos.service';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import type { Medico } from '@/core/models';
import { maskCPF, formatCPF } from '@/shared/pipes/formatters';

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export default function MedicosPanel() {
  const toast = useToast();
  const [items, setItems] = useState<Medico[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Medico | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'nome_completo', dir: 'asc' });

  const [fNome, setFNome] = useState('');
  const [fCrm, setFCrm] = useState('');
  const [fCrmUf, setFCrmUf] = useState('MA');
  const [fCpf, setFCpf] = useState('');
  const [fEspecialidade, setFEspecialidade] = useState('');
  const [fAtivo, setFAtivo] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await listarMedicosAdmin(search ? { search } : undefined);
    if (data) setItems(data as Medico[]);
    setLoading(false);
  };

  useEffect(() => { loadItems(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { setPage(1); }, [search]);

  const filtered = useMemo(() => {
    let result = items;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((m) =>
        m.nome_completo.toLowerCase().includes(q) ||
        m.crm.toLowerCase().includes(q) ||
        (m.especialidade ?? '').toLowerCase().includes(q)
      );
    }
    if (sort.dir) {
      result = [...result].sort((a, b) => {
        const aVal = (a as unknown as Record<string, unknown>)[sort.field];
        const bVal = (b as unknown as Record<string, unknown>)[sort.field];
        const cmp = compareValues(aVal, bVal);
        return sort.dir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [items, search, sort]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

  const resetForm = () => {
    setFNome(''); setFCrm(''); setFCrmUf('MA'); setFCpf('');
    setFEspecialidade(''); setFAtivo(true); setEditing(null);
  };

  const handleNew = () => { resetForm(); setDrawerOpen(true); };

  const handleEdit = (item: Medico) => {
    setEditing(item);
    setFNome(item.nome_completo);
    setFCrm(item.crm);
    setFCrmUf(item.crm_uf);
    setFCpf(item.cpf ?? '');
    setFEspecialidade(item.especialidade ?? '');
    setFAtivo(item.ativo);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!fNome || !fCrm || !fCrmUf) return;
    setSaving(true);
    const payload = {
      nome_completo: fNome,
      crm: fCrm,
      crm_uf: fCrmUf,
      cpf: fCpf || undefined,
      especialidade: fEspecialidade || undefined,
      ativo: fAtivo,
    };

    if (editing) {
      const { error } = await atualizarMedico(editing.id, payload);
      if (error) { toast.error('Erro ao salvar', error.message); setSaving(false); return; }
      toast.success('Médico atualizado!');
    } else {
      const { error } = await criarMedico(payload);
      if (error) { toast.error('Erro ao criar', error.message); setSaving(false); return; }
      toast.success('Médico cadastrado!');
    }

    setSaving(false);
    setDrawerOpen(false);
    resetForm();
    await loadItems();
  };

  const handleDeactivate = async (item: Medico) => {
    if (!window.confirm(`Desativar o médico "${item.nome_completo}"?`)) return;
    const { error } = await desativarMedico(item.id);
    if (error) { toast.error('Erro', error.message); return; }
    toast.success('Médico desativado!');
    await loadItems();
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
            Cadastro de Médicos
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>
            Profissionais médicos referenciados em pareceres e laudos
          </p>
        </div>
        <button className="tfd-btn tfd-btn-primary" onClick={handleNew}>
          <Plus size={16} />
          Novo Médico
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            height: 36,
            minWidth: 280,
          }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, CRM ou especialidade..."
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>
      </div>

      {/* Tabela */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--tfd-surface-border)',
          borderRadius: 'var(--tfd-radius-lg)',
          overflow: 'hidden',
        }}
      >
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <SortTh label="Nome" field="nome_completo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="CRM" field="crm" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="CPF" field="cpf" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Especialidade" field="especialidade" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Status" field="ativo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th align="right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
                  <div className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Carregando...
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center" style={{ color: '#9CA3AF' }}>
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="flex items-center justify-center w-14 h-14 rounded-2xl"
                      style={{ backgroundColor: 'var(--tfd-primary-50)' }}
                    >
                      <Package size={26} style={{ color: 'var(--tfd-primary-400)' }} />
                    </div>
                    <p className="text-sm">
                      {items.length === 0 ? 'Nenhum médico cadastrado.' : 'Nenhum resultado para esta busca.'}
                    </p>
                    {items.length === 0 && (
                      <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
                        <Plus size={14} /> Cadastrar primeiro médico
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((item) => (
                <tr
                  key={item.id}
                  style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                  className="hover:bg-[#F8FAFC] transition-colors"
                >
                  <td className="px-4 py-3.5" style={{ color: '#1A1D2B', fontWeight: 500 }}>
                    {item.nome_completo}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[12px]" style={{ color: '#475569' }}>
                    {item.crm}/{item.crm_uf}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[12px]" style={{ color: '#475569' }}>
                    {item.cpf ? formatCPF(item.cpf) : '—'}
                  </td>
                  <td className="px-4 py-3.5" style={{ color: '#475569' }}>
                    {item.especialidade || '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    {item.ativo ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ background: '#ECFDF5', color: '#059669' }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                        Ativo
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ background: '#FEF3C7', color: '#92400E' }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                        Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                        title="Editar"
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil size={15} />
                      </button>
                      {item.ativo && (
                        <button
                          className="tfd-btn tfd-btn-danger tfd-btn--icon-only"
                          title="Desativar"
                          onClick={() => handleDeactivate(item)}
                        >
                          <Power size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          total={filtered.length}
          pageSize={pageSize}
          page={page}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          recordLabel="médicos"
        />
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); resetForm(); }}
        title={editing ? 'Editar Médico' : 'Novo Médico'}
        subtitle={editing ? `CRM ${editing.crm}/${editing.crm_uf}` : 'Cadastrar profissional médico'}
        width="480px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => { setDrawerOpen(false); resetForm(); }}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSave} disabled={saving || !fNome || !fCrm || !fCrmUf}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : (editing ? 'Salvar Alterações' : 'Cadastrar Médico')}
            </button>
          </>
        }
      >
        <FormField label="Nome Completo" required>
          <input type="text" className="tfd-input" placeholder="Nome completo do médico" value={fNome} onChange={(e) => setFNome(e.target.value)} />
        </FormField>

        <div className="grid grid-cols-[1fr_100px] gap-3">
          <FormField label="CRM" required>
            <input type="text" className="tfd-input" placeholder="Número do CRM" value={fCrm} onChange={(e) => setFCrm(e.target.value)} />
          </FormField>
          <FormField label="UF" required>
            <select className="tfd-input" value={fCrmUf} onChange={(e) => setFCrmUf(e.target.value)}>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="CPF">
          <input type="text" className="tfd-input" placeholder="000.000.000-00" value={fCpf} onChange={(e) => setFCpf(maskCPF(e.target.value))} />
        </FormField>

        <LookupSelect
          categoria="especialidade"
          label="Especialidade"
          value={fEspecialidade}
          onChange={setFEspecialidade}
          valueField="nome"
        />

        {editing && (
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={fAtivo} onChange={(e) => setFAtivo(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: 'var(--tfd-primary-600)' }} />
              <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Médico ativo</span>
            </label>
          </div>
        )}
      </Drawer>
    </>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
    >
      {children}
    </th>
  );
}
