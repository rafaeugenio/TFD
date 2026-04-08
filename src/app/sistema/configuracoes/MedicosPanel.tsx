'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Loader2,
  Search,
  UserRound,
  Package,
  Power,
} from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarMedicosAdmin,
  criarMedico,
  atualizarMedico,
  desativarMedico,
} from '@/services/medicos.service';
import { useLookup } from '@/shared/hooks/useLookup';
import type { Medico } from '@/core/models';
import { maskCPF } from '@/shared/pipes/formatters';

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

  /* Form state */
  const [fNome, setFNome] = useState('');
  const [fCrm, setFCrm] = useState('');
  const [fCrmUf, setFCrmUf] = useState('MA');
  const [fCpf, setFCpf] = useState('');
  const [fEspecialidade, setFEspecialidade] = useState('');
  const [fAtivo, setFAtivo] = useState(true);

  const { options: especialidades } = useLookup('especialidade');

  const loadItems = async () => {
    setLoading(true);
    const { data } = await listarMedicosAdmin(search ? { search } : undefined);
    if (data) setItems(data as Medico[]);
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  const handleSearch = () => { loadItems(); };

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
      <div className="tfd-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            Cadastro de Médicos
          </h2>
          <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
            <Plus size={14} /> Novo Médico
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tfd-text-muted)' }} />
            <input
              type="text"
              className="tfd-input pl-9"
              placeholder="Buscar por nome ou CRM..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
          </div>
          <button className="tfd-btn tfd-btn-secondary tfd-btn--sm" onClick={handleSearch}>
            Buscar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-text-muted)' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
              <Package size={28} style={{ color: 'var(--tfd-primary-400)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>Nenhum médico cadastrado</p>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Cadastre médicos conforme forem aparecendo nos pareceres do SEI.</p>
            </div>
            <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
              <Plus size={14} /> Cadastrar primeiro médico
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-100)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-50)'; }}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                  >
                    <UserRound size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {item.nome_completo}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                      CRM {item.crm}/{item.crm_uf}
                      {item.especialidade && ` · ${item.especialidade}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {!item.ativo && (
                    <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary text-[10px]">Inativo</span>
                  )}
                  <button
                    className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                    title="Editar"
                    style={{ color: 'var(--tfd-primary-500)' }}
                    onClick={() => handleEdit(item)}
                  >
                    <Pencil size={14} />
                  </button>
                  {item.ativo && (
                    <button
                      className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                      title="Desativar"
                      style={{ color: 'var(--tfd-status-danger)' }}
                      onClick={() => handleDeactivate(item)}
                    >
                      <Power size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
            {items.length} médico{items.length !== 1 ? 's' : ''} cadastrado{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Drawer: Novo/Editar Médico */}
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

        <FormField label="Especialidade">
          <select className="tfd-input" value={fEspecialidade} onChange={(e) => setFEspecialidade(e.target.value)}>
            <option value="">Selecione...</option>
            {especialidades.map((esp) => (
              <option key={esp.value} value={esp.label}>{esp.label}</option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            Especialidades configuradas em Tabelas Auxiliares &gt; Especialidades Médicas
          </p>
        </FormField>

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
