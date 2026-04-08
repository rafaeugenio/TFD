#!/usr/bin/env node
/**
 * Script para popular a tabela cid10 com dados completos (~14.400 códigos).
 *
 * Fonte: DATASUS — tabela CID-10 disponível em repositórios públicos.
 *
 * Uso:
 *   1. Baixe o CSV do CID-10 (ex: https://github.com/andersonbosa/cid-10-csv)
 *      ou use o arquivo CID-10-SUBCATEGORIAS.CSV do DATASUS
 *   2. Coloque o CSV neste diretório como "cid10_source.csv"
 *   3. Execute: node 00021b_seed_cid10.mjs > 00021b_seed_cid10.sql
 *   4. Aplique: psql $DATABASE_URL < 00021b_seed_cid10.sql
 *
 * Formato CSV esperado (separador ";"):
 *   SUBCAT;DESCRICAO;DESCRABREV;REFER;EXCLUIDOS
 *   ou
 *   codigo;descricao
 *
 * O script detecta automaticamente o formato.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function escapeSql(str) {
  return str.replace(/'/g, "''").trim();
}

function extrairCapitulo(codigo) {
  const letra = codigo.charAt(0);
  const capitulos = {
    A: 'I', B: 'I',
    C: 'II', D: 'II',
    E: 'IV',
    F: 'V',
    G: 'VI',
    H: 'VII', // H00-H59 = VII, H60-H95 = VIII
    I: 'IX',
    J: 'X',
    K: 'XI',
    L: 'XII',
    M: 'XIII',
    N: 'XIV',
    O: 'XV',
    P: 'XVI',
    Q: 'XVII',
    R: 'XVIII',
    S: 'XIX', T: 'XIX',
    V: 'XX', W: 'XX', X: 'XX', Y: 'XX',
    Z: 'XXI',
    U: 'XXII',
  };
  return capitulos[letra] || null;
}

function extrairCategoria(codigo) {
  // Categoria = 3 primeiros caracteres (ex: "C50" de "C50.1")
  return codigo.replace('.', '').substring(0, 3);
}

function processarCSV(conteudo) {
  const linhas = conteudo.split('\n').filter((l) => l.trim());
  const registros = [];

  // Detectar separador e formato
  const primeiraLinha = linhas[0];
  const separador = primeiraLinha.includes(';') ? ';' : ',';
  const campos = primeiraLinha.split(separador).map((c) => c.trim().replace(/"/g, ''));

  // Pular header se existir
  const inicio = /^[A-Z]/.test(campos[0]) && campos[0].length <= 10 ? 0 : 1;

  for (let i = inicio; i < linhas.length; i++) {
    const partes = linhas[i].split(separador).map((c) => c.trim().replace(/"/g, ''));
    if (partes.length < 2) continue;

    let codigo = partes[0].trim();
    let descricao = partes[1].trim();

    if (!codigo || !descricao) continue;
    if (codigo.length < 3) continue;

    // Normalizar código: inserir ponto se não tiver (ex: "A000" → "A00.0")
    if (codigo.length > 3 && !codigo.includes('.')) {
      codigo = codigo.substring(0, 3) + '.' + codigo.substring(3);
    }

    const categoria = extrairCategoria(codigo);
    const capitulo = extrairCapitulo(codigo);
    const subcategoria = codigo.includes('.') ? codigo : null;

    registros.push({ codigo, descricao, capitulo, categoria, subcategoria });
  }

  return registros;
}

function gerarSQL(registros) {
  const linhas = [
    '-- ============================================================',
    '-- TFD — Seed CID-10: ~14.400 códigos',
    '-- Gerado automaticamente por 00021b_seed_cid10.mjs',
    '-- ============================================================',
    '',
    '-- Limpar dados existentes',
    'TRUNCATE TABLE cid10 RESTART IDENTITY;',
    '',
  ];

  // Inserir em batches de 500 para evitar problemas de tamanho
  const batchSize = 500;
  for (let i = 0; i < registros.length; i += batchSize) {
    const batch = registros.slice(i, i + batchSize);
    linhas.push('INSERT INTO cid10 (codigo, descricao, capitulo, grupo, categoria, subcategoria) VALUES');

    const valores = batch.map((r) => {
      const cap = r.capitulo ? `'${r.capitulo}'` : 'NULL';
      const sub = r.subcategoria ? `'${escapeSql(r.subcategoria)}'` : 'NULL';
      return `('${escapeSql(r.codigo)}', '${escapeSql(r.descricao)}', ${cap}, NULL, '${escapeSql(r.categoria)}', ${sub})`;
    });

    linhas.push(valores.join(',\n') + ';');
    linhas.push('');
  }

  return linhas.join('\n');
}

// Main
try {
  const csvPath = join(__dirname, 'cid10_source.csv');
  const conteudo = readFileSync(csvPath, 'utf-8');
  const registros = processarCSV(conteudo);
  console.log(gerarSQL(registros));
  console.error(`✓ ${registros.length} códigos CID-10 processados.`);
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error('Erro: arquivo cid10_source.csv não encontrado.');
    console.error('Baixe de: https://github.com/andersonbosa/cid-10-csv');
    console.error('Ou do DATASUS: sigtap.datasus.gov.br');
    console.error('Coloque como: supabase/migrations/cid10_source.csv');
    process.exit(1);
  }
  throw err;
}
