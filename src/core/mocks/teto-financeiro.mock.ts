/* ============================================================
   Teto Financeiro — Mock Data (E8)
   ============================================================ */

import type {
  TetoFinanceiro,
  ResumoTetoEstadual,
  AlertaTeto,
} from '../models/teto-financeiro.model';

export const MOCK_RESUMO_ESTADUAL: ResumoTetoEstadual = {
  tetoTotal: 4800000.00,
  gastoAcumulado: 3456000.00,
  saldoDisponivel: 1344000.00,
  percentualUtilizacao: 72.0,
};

export const MOCK_TETOS_MUNICIPIO: TetoFinanceiro[] = [
  {
    id: 'teto-001',
    exercicio: 2026,
    municipioId: 'mun-001',
    municipio: 'São Luís',
    regional: 'Grande São Luís',
    tetoAlocado: 1200000.00,
    gastoAcumulado: 1090000.00,
    saldo: 110000.00,
    percentualUtilizacao: 90.83,
    status: 'ALERTA',
    quantidadeFaturas: 12,
  },
  {
    id: 'teto-002',
    exercicio: 2026,
    municipioId: 'mun-002',
    municipio: 'Imperatriz',
    regional: 'Tocantina',
    tetoAlocado: 800000.00,
    gastoAcumulado: 780000.00,
    saldo: 20000.00,
    percentualUtilizacao: 97.50,
    status: 'CRITICO',
    quantidadeFaturas: 9,
  },
  {
    id: 'teto-003',
    exercicio: 2026,
    municipioId: 'mun-003',
    municipio: 'Caxias',
    regional: 'Leste Maranhense',
    tetoAlocado: 600000.00,
    gastoAcumulado: 420000.00,
    saldo: 180000.00,
    percentualUtilizacao: 70.00,
    status: 'NORMAL',
    quantidadeFaturas: 7,
  },
  {
    id: 'teto-004',
    exercicio: 2026,
    municipioId: 'mun-004',
    municipio: 'Timon',
    regional: 'Leste Maranhense',
    tetoAlocado: 500000.00,
    gastoAcumulado: 310000.00,
    saldo: 190000.00,
    percentualUtilizacao: 62.00,
    status: 'NORMAL',
    quantidadeFaturas: 5,
  },
  {
    id: 'teto-005',
    exercicio: 2026,
    municipioId: 'mun-005',
    municipio: 'Bacabal',
    regional: 'Médio Mearim',
    tetoAlocado: 450000.00,
    gastoAcumulado: 346000.00,
    saldo: 104000.00,
    percentualUtilizacao: 76.89,
    status: 'NORMAL',
    quantidadeFaturas: 6,
  },
  {
    id: 'teto-006',
    exercicio: 2026,
    municipioId: 'mun-006',
    municipio: 'Balsas',
    regional: 'Sul Maranhense',
    tetoAlocado: 350000.00,
    gastoAcumulado: 180000.00,
    saldo: 170000.00,
    percentualUtilizacao: 51.43,
    status: 'NORMAL',
    quantidadeFaturas: 4,
  },
  {
    id: 'teto-007',
    exercicio: 2026,
    municipioId: 'mun-007',
    municipio: 'Codó',
    regional: 'Médio Mearim',
    tetoAlocado: 400000.00,
    gastoAcumulado: 150000.00,
    saldo: 250000.00,
    percentualUtilizacao: 37.50,
    status: 'NORMAL',
    quantidadeFaturas: 3,
  },
  {
    id: 'teto-008',
    exercicio: 2026,
    municipioId: 'mun-008',
    municipio: 'Açailândia',
    regional: 'Tocantina',
    tetoAlocado: 500000.00,
    gastoAcumulado: 180000.00,
    saldo: 320000.00,
    percentualUtilizacao: 36.00,
    status: 'NORMAL',
    quantidadeFaturas: 3,
  },
];

export const MOCK_ALERTAS_TETO: AlertaTeto[] = [
  {
    id: 'alerta-001',
    municipio: 'Imperatriz',
    nivel: 'CRITICO',
    percentualUtilizacao: 97.50,
    gasto: 780000.00,
    teto: 800000.00,
    dataAlerta: '2026-03-18T10:00:00',
    acaoTomada: 'Notificação enviada ao gestor municipal',
  },
  {
    id: 'alerta-002',
    municipio: 'São Luís',
    nivel: 'ALERTA',
    percentualUtilizacao: 90.83,
    gasto: 1090000.00,
    teto: 1200000.00,
    dataAlerta: '2026-03-12T08:30:00',
  },
];

/** Exercícios disponíveis */
export const EXERCICIOS_DISPONIVEIS = [2026, 2025, 2024];

/** Meses para filtro */
export const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];
