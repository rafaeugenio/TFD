export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      acoes_catalogo: {
        Row: {
          acao: string
          descricao: string | null
          nome_humano: string
          ordem: number
          tela_id: string
        }
        Insert: {
          acao: string
          descricao?: string | null
          nome_humano: string
          ordem?: number
          tela_id: string
        }
        Update: {
          acao?: string
          descricao?: string | null
          nome_humano?: string
          ordem?: number
          tela_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoes_catalogo_tela_id_fkey"
            columns: ["tela_id"]
            isOneToOne: false
            referencedRelation: "telas_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      acompanhantes: {
        Row: {
          cns: string | null
          cpf: string
          created_at: string | null
          data_nascimento: string | null
          descricao_necessidade: string | null
          email: string | null
          id: string
          necessidade_especial: boolean | null
          nome_completo: string
          paciente_id: string
          sexo: string
          telefone: string | null
          vinculo: string | null
        }
        Insert: {
          cns?: string | null
          cpf: string
          created_at?: string | null
          data_nascimento?: string | null
          descricao_necessidade?: string | null
          email?: string | null
          id?: string
          necessidade_especial?: boolean | null
          nome_completo: string
          paciente_id: string
          sexo: string
          telefone?: string | null
          vinculo?: string | null
        }
        Update: {
          cns?: string | null
          cpf?: string
          created_at?: string | null
          data_nascimento?: string | null
          descricao_necessidade?: string | null
          email?: string | null
          id?: string
          necessidade_especial?: boolean | null
          nome_completo?: string
          paciente_id?: string
          sexo?: string
          telefone?: string | null
          vinculo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "acompanhantes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      adicionais: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          beneficiario_id: string | null
          beneficiario_tipo: string
          categoria: string
          created_at: string | null
          criado_por: string | null
          data_ocorrencia: string
          descricao: string
          documento_id: string | null
          id: string
          justificativa_decisao: string | null
          justificativa_solicitacao: string | null
          solicitacao_id: string
          status: string
          updated_at: string | null
          valor: number
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          beneficiario_id?: string | null
          beneficiario_tipo?: string
          categoria?: string
          created_at?: string | null
          criado_por?: string | null
          data_ocorrencia: string
          descricao: string
          documento_id?: string | null
          id?: string
          justificativa_decisao?: string | null
          justificativa_solicitacao?: string | null
          solicitacao_id: string
          status?: string
          updated_at?: string | null
          valor: number
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          beneficiario_id?: string | null
          beneficiario_tipo?: string
          categoria?: string
          created_at?: string | null
          criado_por?: string | null
          data_ocorrencia?: string
          descricao?: string
          documento_id?: string | null
          id?: string
          justificativa_decisao?: string | null
          justificativa_solicitacao?: string | null
          solicitacao_id?: string
          status?: string
          updated_at?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "adicionais_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adicionais_beneficiario_id_fkey"
            columns: ["beneficiario_id"]
            isOneToOne: false
            referencedRelation: "acompanhantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adicionais_criado_por_fkey"
            columns: ["criado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adicionais_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adicionais_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      agendamentos: {
        Row: {
          cidade_destino: string
          cnes: string | null
          comprovante_doc_id: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          contato_unidade: string | null
          created_at: string | null
          data_hora_agendamento: string
          id: string
          numero_cnrac: string | null
          origem_agendamento: string | null
          solicitacao_id: string
          status: string | null
          tipo_atendimento: string | null
          uf_destino: string
          unidade_destino_id: string | null
          unidade_executante: string
          updated_at: string | null
        }
        Insert: {
          cidade_destino: string
          cnes?: string | null
          comprovante_doc_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          contato_unidade?: string | null
          created_at?: string | null
          data_hora_agendamento: string
          id?: string
          numero_cnrac?: string | null
          origem_agendamento?: string | null
          solicitacao_id: string
          status?: string | null
          tipo_atendimento?: string | null
          uf_destino: string
          unidade_destino_id?: string | null
          unidade_executante: string
          updated_at?: string | null
        }
        Update: {
          cidade_destino?: string
          cnes?: string | null
          comprovante_doc_id?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          contato_unidade?: string | null
          created_at?: string | null
          data_hora_agendamento?: string
          id?: string
          numero_cnrac?: string | null
          origem_agendamento?: string | null
          solicitacao_id?: string
          status?: string | null
          tipo_atendimento?: string | null
          uf_destino?: string
          unidade_destino_id?: string | null
          unidade_executante?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agendamentos_comprovante_doc_id_fkey"
            columns: ["comprovante_doc_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agendamentos_unidade_destino_id_fkey"
            columns: ["unidade_destino_id"]
            isOneToOne: false
            referencedRelation: "unidades_destino"
            referencedColumns: ["id"]
          },
        ]
      }
      ajudas_custo: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          ativa: boolean
          created_at: string | null
          dados_bancarios_id: string | null
          data_cancelamento: string | null
          data_fim: string | null
          data_inicio: string
          data_reembolso: string | null
          dias_elegiveis: number | null
          dias_internacao: number | null
          id: string
          motivo_cancelamento_texto: string | null
          observacoes: string | null
          pago_em: string | null
          pago_por: string | null
          solicitacao_id: string
          status: string | null
          tipo: string
          updated_at: string | null
          valor_diaria: number
          valor_pago: number | null
          valor_reembolso: number | null
          valor_total: number | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativa?: boolean
          created_at?: string | null
          dados_bancarios_id?: string | null
          data_cancelamento?: string | null
          data_fim?: string | null
          data_inicio: string
          data_reembolso?: string | null
          dias_elegiveis?: number | null
          dias_internacao?: number | null
          id?: string
          motivo_cancelamento_texto?: string | null
          observacoes?: string | null
          pago_em?: string | null
          pago_por?: string | null
          solicitacao_id: string
          status?: string | null
          tipo: string
          updated_at?: string | null
          valor_diaria: number
          valor_pago?: number | null
          valor_reembolso?: number | null
          valor_total?: number | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativa?: boolean
          created_at?: string | null
          dados_bancarios_id?: string | null
          data_cancelamento?: string | null
          data_fim?: string | null
          data_inicio?: string
          data_reembolso?: string | null
          dias_elegiveis?: number | null
          dias_internacao?: number | null
          id?: string
          motivo_cancelamento_texto?: string | null
          observacoes?: string | null
          pago_em?: string | null
          pago_por?: string | null
          solicitacao_id?: string
          status?: string | null
          tipo?: string
          updated_at?: string | null
          valor_diaria?: number
          valor_pago?: number | null
          valor_reembolso?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ajudas_custo_aprovado_por_fkey"
            columns: ["aprovado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajudas_custo_dados_bancarios_id_fkey"
            columns: ["dados_bancarios_id"]
            isOneToOne: false
            referencedRelation: "dados_bancarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajudas_custo_pago_por_fkey"
            columns: ["pago_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ajudas_custo_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      bpa_lancamentos: {
        Row: {
          id: string
          lancado_em: string
          lancado_por: string | null
          origem_id: string
          tipo: string
          trecho: string | null
        }
        Insert: {
          id?: string
          lancado_em?: string
          lancado_por?: string | null
          origem_id: string
          tipo: string
          trecho?: string | null
        }
        Update: {
          id?: string
          lancado_em?: string
          lancado_por?: string | null
          origem_id?: string
          tipo?: string
          trecho?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bpa_lancamentos_lancado_por_fkey"
            columns: ["lancado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cid10: {
        Row: {
          codigo: string
          descricao: string
          id: number
        }
        Insert: {
          codigo: string
          descricao: string
          id?: number
        }
        Update: {
          codigo?: string
          descricao?: string
          id?: number
        }
        Relationships: []
      }
      cid11: {
        Row: {
          codigo: string
          descricao: string
          id: number
        }
        Insert: {
          codigo: string
          descricao: string
          id?: number
        }
        Update: {
          codigo?: string
          descricao?: string
          id?: number
        }
        Relationships: []
      }
      cobrancas_externas: {
        Row: {
          canal: string | null
          contato_canal: string | null
          conteudo_envio: string | null
          conteudo_resposta: string | null
          created_at: string | null
          data_envio: string
          data_resposta: string | null
          destinatario: string
          id: string
          rota_regulacao_id: string
          status_cobranca: string | null
        }
        Insert: {
          canal?: string | null
          contato_canal?: string | null
          conteudo_envio?: string | null
          conteudo_resposta?: string | null
          created_at?: string | null
          data_envio: string
          data_resposta?: string | null
          destinatario: string
          id?: string
          rota_regulacao_id: string
          status_cobranca?: string | null
        }
        Update: {
          canal?: string | null
          contato_canal?: string | null
          conteudo_envio?: string | null
          conteudo_resposta?: string | null
          created_at?: string | null
          data_envio?: string
          data_resposta?: string | null
          destinatario?: string
          id?: string
          rota_regulacao_id?: string
          status_cobranca?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cobrancas_externas_rota_regulacao_id_fkey"
            columns: ["rota_regulacao_id"]
            isOneToOne: false
            referencedRelation: "rotas_regulacao"
            referencedColumns: ["id"]
          },
        ]
      }
      codigos_convite: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string | null
          id: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string | null
          id?: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string | null
          id?: string
        }
        Relationships: []
      }
      companhias_transporte: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      dados_bancarios: {
        Row: {
          agencia: string
          banco: string
          conta: string
          cpf_titular: string
          created_at: string | null
          id: string
          nome_titular: string
          paciente_id: string
          pix_chave: string | null
          pix_tipo: string | null
          tipo_conta: string | null
        }
        Insert: {
          agencia: string
          banco: string
          conta: string
          cpf_titular: string
          created_at?: string | null
          id?: string
          nome_titular: string
          paciente_id: string
          pix_chave?: string | null
          pix_tipo?: string | null
          tipo_conta?: string | null
        }
        Update: {
          agencia?: string
          banco?: string
          conta?: string
          cpf_titular?: string
          created_at?: string | null
          id?: string
          nome_titular?: string
          paciente_id?: string
          pix_chave?: string | null
          pix_tipo?: string | null
          tipo_conta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dados_bancarios_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      despachos_financeiros: {
        Row: {
          created_at: string
          gerado_por: string | null
          id: string
          numero_sei: string | null
          observacoes: string | null
          solicitacao_id: string
          texto_despacho: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          gerado_por?: string | null
          id?: string
          numero_sei?: string | null
          observacoes?: string | null
          solicitacao_id: string
          texto_despacho?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          gerado_por?: string | null
          id?: string
          numero_sei?: string | null
          observacoes?: string | null
          solicitacao_id?: string
          texto_despacho?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "despachos_financeiros_gerado_por_fkey"
            columns: ["gerado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "despachos_financeiros_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      devolucoes: {
        Row: {
          created_at: string | null
          devolvido_por: string | null
          id: string
          motivo: string
          observacao_resolucao: string | null
          recebido_por: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          setor_destino: string
          setor_origem: string
          solicitacao_id: string
          status_devolucao: string
          status_retorno: string
          updated_at: string | null
          urgencia: string
        }
        Insert: {
          created_at?: string | null
          devolvido_por?: string | null
          id?: string
          motivo: string
          observacao_resolucao?: string | null
          recebido_por?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          setor_destino: string
          setor_origem: string
          solicitacao_id: string
          status_devolucao?: string
          status_retorno: string
          updated_at?: string | null
          urgencia?: string
        }
        Update: {
          created_at?: string | null
          devolvido_por?: string | null
          id?: string
          motivo?: string
          observacao_resolucao?: string | null
          recebido_por?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          setor_destino?: string
          setor_origem?: string
          solicitacao_id?: string
          status_devolucao?: string
          status_retorno?: string
          updated_at?: string | null
          urgencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "devolucoes_devolvido_por_fkey"
            columns: ["devolvido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_recebido_por_fkey"
            columns: ["recebido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_resolvido_por_fkey"
            columns: ["resolvido_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devolucoes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          created_at: string | null
          id: string
          nome_arquivo: string
          paciente_id: string | null
          solicitacao_id: string | null
          status: string | null
          tipo: string
          upload_por: string | null
          url_arquivo: string
          viagem_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome_arquivo: string
          paciente_id?: string | null
          solicitacao_id?: string | null
          status?: string | null
          tipo: string
          upload_por?: string | null
          url_arquivo: string
          viagem_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome_arquivo?: string
          paciente_id?: string | null
          solicitacao_id?: string | null
          status?: string | null
          tipo?: string
          upload_por?: string | null
          url_arquivo?: string
          viagem_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_upload_por_fkey"
            columns: ["upload_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
        ]
      }
      encerramentos: {
        Row: {
          created_at: string | null
          data_encerramento: string
          id: string
          motivo: string
          observacoes: string | null
          registrado_por: string | null
          relatorio_alta_doc_id: string | null
          solicitacao_id: string
        }
        Insert: {
          created_at?: string | null
          data_encerramento: string
          id?: string
          motivo: string
          observacoes?: string | null
          registrado_por?: string | null
          relatorio_alta_doc_id?: string | null
          solicitacao_id: string
        }
        Update: {
          created_at?: string | null
          data_encerramento?: string
          id?: string
          motivo?: string
          observacoes?: string | null
          registrado_por?: string | null
          relatorio_alta_doc_id?: string | null
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "encerramentos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encerramentos_relatorio_alta_doc_id_fkey"
            columns: ["relatorio_alta_doc_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encerramentos_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      exigencias: {
        Row: {
          created_at: string | null
          descricao: string
          id: string
          parecer_id: string
          prazo_resposta: string | null
          status_resposta: string | null
          tipo: string | null
        }
        Insert: {
          created_at?: string | null
          descricao: string
          id?: string
          parecer_id: string
          prazo_resposta?: string | null
          status_resposta?: string | null
          tipo?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string
          id?: string
          parecer_id?: string
          prazo_resposta?: string | null
          status_resposta?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exigencias_parecer_id_fkey"
            columns: ["parecer_id"]
            isOneToOne: false
            referencedRelation: "pareceres"
            referencedColumns: ["id"]
          },
        ]
      }
      log_auditoria: {
        Row: {
          acao: string
          campo_alterado: string | null
          created_at: string | null
          entidade_alterada: string | null
          entidade_id: string | null
          id: string
          ip: string | null
          perfil_usuario: string | null
          solicitacao_id: string | null
          user_agent: string | null
          usuario_id: string | null
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          acao: string
          campo_alterado?: string | null
          created_at?: string | null
          entidade_alterada?: string | null
          entidade_id?: string | null
          id?: string
          ip?: string | null
          perfil_usuario?: string | null
          solicitacao_id?: string | null
          user_agent?: string | null
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          acao?: string
          campo_alterado?: string | null
          created_at?: string | null
          entidade_alterada?: string | null
          entidade_id?: string | null
          id?: string
          ip?: string | null
          perfil_usuario?: string | null
          solicitacao_id?: string | null
          user_agent?: string | null
          usuario_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "log_auditoria_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "log_auditoria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      metas_anuais: {
        Row: {
          ano: number
          created_at: string | null
          id: string
          observacoes: string | null
          updated_at: string | null
          valor_procedimentos: number
        }
        Insert: {
          ano: number
          created_at?: string | null
          id?: string
          observacoes?: string | null
          updated_at?: string | null
          valor_procedimentos?: number
        }
        Update: {
          ano?: number
          created_at?: string | null
          id?: string
          observacoes?: string | null
          updated_at?: string | null
          valor_procedimentos?: number
        }
        Relationships: []
      }
      municipios: {
        Row: {
          ativo: boolean | null
          codigo_ibge: string | null
          created_at: string | null
          id: string
          nome: string
          populacao: number | null
          regional: string
          uf: string
        }
        Insert: {
          ativo?: boolean | null
          codigo_ibge?: string | null
          created_at?: string | null
          id?: string
          nome: string
          populacao?: number | null
          regional: string
          uf?: string
        }
        Update: {
          ativo?: boolean | null
          codigo_ibge?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          populacao?: number | null
          regional?: string
          uf?: string
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          canal: string | null
          conteudo: string
          created_at: string | null
          destinatario: string | null
          destinatario_tipo: string | null
          enviado_em: string | null
          erro: string | null
          id: string
          solicitacao_id: string | null
          status: string | null
          tentativas: number | null
          tipo: string
        }
        Insert: {
          canal?: string | null
          conteudo: string
          created_at?: string | null
          destinatario?: string | null
          destinatario_tipo?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          solicitacao_id?: string | null
          status?: string | null
          tentativas?: number | null
          tipo: string
        }
        Update: {
          canal?: string | null
          conteudo?: string
          created_at?: string | null
          destinatario?: string | null
          destinatario_tipo?: string | null
          enviado_em?: string | null
          erro?: string | null
          id?: string
          solicitacao_id?: string | null
          status?: string | null
          tentativas?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      observacoes_processo: {
        Row: {
          autor_id: string
          conteudo: string
          created_at: string | null
          id: string
          lida: boolean | null
          lida_em: string | null
          perfil_autor: string
          setor_destinatario: string | null
          solicitacao_id: string
        }
        Insert: {
          autor_id: string
          conteudo: string
          created_at?: string | null
          id?: string
          lida?: boolean | null
          lida_em?: string | null
          perfil_autor: string
          setor_destinatario?: string | null
          solicitacao_id: string
        }
        Update: {
          autor_id?: string
          conteudo?: string
          created_at?: string | null
          id?: string
          lida?: boolean | null
          lida_em?: string | null
          perfil_autor?: string
          setor_destinatario?: string | null
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "observacoes_processo_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observacoes_processo_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      pacientes: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          cns: string
          cpf: string
          created_at: string | null
          data_nascimento: string
          email: string | null
          id: string
          logradouro: string | null
          municipio: string | null
          municipio_residencia_id: string | null
          nome_completo: string
          nome_mae: string | null
          numero: string | null
          sexo: string | null
          telefone_celular: string | null
          telefone_fixo: string | null
          uf: string | null
          updated_at: string | null
          zona_regional: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cns: string
          cpf: string
          created_at?: string | null
          data_nascimento: string
          email?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          municipio_residencia_id?: string | null
          nome_completo: string
          nome_mae?: string | null
          numero?: string | null
          sexo?: string | null
          telefone_celular?: string | null
          telefone_fixo?: string | null
          uf?: string | null
          updated_at?: string | null
          zona_regional?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cns?: string
          cpf?: string
          created_at?: string | null
          data_nascimento?: string
          email?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          municipio_residencia_id?: string | null
          nome_completo?: string
          nome_mae?: string | null
          numero?: string | null
          sexo?: string | null
          telefone_celular?: string | null
          telefone_fixo?: string | null
          uf?: string | null
          updated_at?: string | null
          zona_regional?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pacientes_municipio_residencia_id_fkey"
            columns: ["municipio_residencia_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      papeis: {
        Row: {
          cor: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      papel_tela_acoes: {
        Row: {
          acao: string
          papel_id: string
          tela_id: string
        }
        Insert: {
          acao: string
          papel_id: string
          tela_id: string
        }
        Update: {
          acao?: string
          papel_id?: string
          tela_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "papel_tela_acoes_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "papel_tela_acoes_tela_id_fkey"
            columns: ["tela_id"]
            isOneToOne: false
            referencedRelation: "telas_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      pareceres: {
        Row: {
          autoriza_acompanhante: boolean | null
          checklist_elegibilidade: Json | null
          cid_principal: string | null
          cid_secundario: string | null
          created_at: string | null
          decisao: string
          id: string
          justificativa: string | null
          medico_auditor_id: string | null
          observacoes_medicas: string | null
          solicitacao_id: string
          tipo: string | null
          versao_cid: string | null
        }
        Insert: {
          autoriza_acompanhante?: boolean | null
          checklist_elegibilidade?: Json | null
          cid_principal?: string | null
          cid_secundario?: string | null
          created_at?: string | null
          decisao: string
          id?: string
          justificativa?: string | null
          medico_auditor_id?: string | null
          observacoes_medicas?: string | null
          solicitacao_id: string
          tipo?: string | null
          versao_cid?: string | null
        }
        Update: {
          autoriza_acompanhante?: boolean | null
          checklist_elegibilidade?: Json | null
          cid_principal?: string | null
          cid_secundario?: string | null
          created_at?: string | null
          decisao?: string
          id?: string
          justificativa?: string | null
          medico_auditor_id?: string | null
          observacoes_medicas?: string | null
          solicitacao_id?: string
          tipo?: string | null
          versao_cid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pareceres_medico_auditor_id_fkey"
            columns: ["medico_auditor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pareceres_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      permanencias: {
        Row: {
          comunicado_por: string | null
          created_at: string | null
          data_comunicacao: string | null
          id: string
          motivo: string | null
          motivo_descricao: string | null
          nova_data_retorno_prevista: string | null
          registrado_por: string | null
          solicitacao_id: string
        }
        Insert: {
          comunicado_por?: string | null
          created_at?: string | null
          data_comunicacao?: string | null
          id?: string
          motivo?: string | null
          motivo_descricao?: string | null
          nova_data_retorno_prevista?: string | null
          registrado_por?: string | null
          solicitacao_id: string
        }
        Update: {
          comunicado_por?: string | null
          created_at?: string | null
          data_comunicacao?: string | null
          id?: string
          motivo?: string | null
          motivo_descricao?: string | null
          nova_data_retorno_prevista?: string | null
          registrado_por?: string | null
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permanencias_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permanencias_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      prorrogacoes: {
        Row: {
          complemento_ajuda_id: string | null
          created_at: string | null
          decisao: string | null
          decisao_em: string | null
          decisao_por: string | null
          dias_adicionais_solicitados: number
          documento_justificativa_id: string | null
          id: string
          impacto_diarias_valor: number | null
          justificativa_decisao: string | null
          justificativa_medica: string
          nova_data_retorno: string
          nova_passagem_necessaria: boolean | null
          permanencia_id: string
          updated_at: string | null
          viagem_prorrogacao_id: string | null
        }
        Insert: {
          complemento_ajuda_id?: string | null
          created_at?: string | null
          decisao?: string | null
          decisao_em?: string | null
          decisao_por?: string | null
          dias_adicionais_solicitados: number
          documento_justificativa_id?: string | null
          id?: string
          impacto_diarias_valor?: number | null
          justificativa_decisao?: string | null
          justificativa_medica: string
          nova_data_retorno: string
          nova_passagem_necessaria?: boolean | null
          permanencia_id: string
          updated_at?: string | null
          viagem_prorrogacao_id?: string | null
        }
        Update: {
          complemento_ajuda_id?: string | null
          created_at?: string | null
          decisao?: string | null
          decisao_em?: string | null
          decisao_por?: string | null
          dias_adicionais_solicitados?: number
          documento_justificativa_id?: string | null
          id?: string
          impacto_diarias_valor?: number | null
          justificativa_decisao?: string | null
          justificativa_medica?: string
          nova_data_retorno?: string
          nova_passagem_necessaria?: boolean | null
          permanencia_id?: string
          updated_at?: string | null
          viagem_prorrogacao_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prorrogacoes_complemento_ajuda_id_fkey"
            columns: ["complemento_ajuda_id"]
            isOneToOne: false
            referencedRelation: "ajudas_custo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prorrogacoes_decisao_por_fkey"
            columns: ["decisao_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prorrogacoes_documento_justificativa_id_fkey"
            columns: ["documento_justificativa_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prorrogacoes_permanencia_id_fkey"
            columns: ["permanencia_id"]
            isOneToOne: false
            referencedRelation: "permanencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prorrogacoes_viagem_prorrogacao_id_fkey"
            columns: ["viagem_prorrogacao_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
        ]
      }
      regioes: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: []
      }
      regionais_saude: {
        Row: {
          ativo: boolean
          bairro: string | null
          codigo: string
          created_at: string
          email: string | null
          email2: string | null
          id: string
          logradouro: string | null
          municipio: string | null
          municipio_sede: string | null
          nome: string
          ordem: number
          regiao_id: string | null
          telefone: string | null
          telefone2: string | null
          uf: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bairro?: string | null
          codigo: string
          created_at?: string
          email?: string | null
          email2?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          municipio_sede?: string | null
          nome: string
          ordem?: number
          regiao_id?: string | null
          telefone?: string | null
          telefone2?: string | null
          uf?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bairro?: string | null
          codigo?: string
          created_at?: string
          email?: string | null
          email2?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          municipio_sede?: string | null
          nome?: string
          ordem?: number
          regiao_id?: string | null
          telefone?: string | null
          telefone2?: string | null
          uf?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regionais_saude_regiao_id_fkey"
            columns: ["regiao_id"]
            isOneToOne: false
            referencedRelation: "regioes"
            referencedColumns: ["id"]
          },
        ]
      }
      regionais_saude_municipios: {
        Row: {
          created_at: string
          id: string
          municipio_nome: string
          regional_saude_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          municipio_nome: string
          regional_saude_id: string
        }
        Update: {
          created_at?: string
          id?: string
          municipio_nome?: string
          regional_saude_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regionais_saude_municipios_regional_saude_id_fkey"
            columns: ["regional_saude_id"]
            isOneToOne: false
            referencedRelation: "regionais_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      remarcacoes: {
        Row: {
          aprovada_por: string | null
          id: string
          impacto_nas_diarias: number | null
          motivo_remarcacao: string
          nova_data_embarque: string
          solicitada_em: string | null
          solicitada_por: string | null
          status: string | null
          viagem_id: string
        }
        Insert: {
          aprovada_por?: string | null
          id?: string
          impacto_nas_diarias?: number | null
          motivo_remarcacao: string
          nova_data_embarque: string
          solicitada_em?: string | null
          solicitada_por?: string | null
          status?: string | null
          viagem_id: string
        }
        Update: {
          aprovada_por?: string | null
          id?: string
          impacto_nas_diarias?: number | null
          motivo_remarcacao?: string
          nova_data_embarque?: string
          solicitada_em?: string | null
          solicitada_por?: string | null
          status?: string | null
          viagem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remarcacoes_aprovada_por_fkey"
            columns: ["aprovada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remarcacoes_solicitada_por_fkey"
            columns: ["solicitada_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remarcacoes_viagem_id_fkey"
            columns: ["viagem_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
        ]
      }
      rotas_regulacao: {
        Row: {
          created_at: string | null
          data_retorno_previsto: string | null
          id: string
          justificativa: string | null
          lembrete: string | null
          outros_forma_contato: string | null
          outros_observacao: string | null
          outros_unidade_orgao: string | null
          responsavel_id: string | null
          solicitacao_id: string
          status_espera: string | null
          tipo_rota: string
        }
        Insert: {
          created_at?: string | null
          data_retorno_previsto?: string | null
          id?: string
          justificativa?: string | null
          lembrete?: string | null
          outros_forma_contato?: string | null
          outros_observacao?: string | null
          outros_unidade_orgao?: string | null
          responsavel_id?: string | null
          solicitacao_id: string
          status_espera?: string | null
          tipo_rota: string
        }
        Update: {
          created_at?: string | null
          data_retorno_previsto?: string | null
          id?: string
          justificativa?: string | null
          lembrete?: string | null
          outros_forma_contato?: string | null
          outros_observacao?: string | null
          outros_unidade_orgao?: string | null
          responsavel_id?: string | null
          solicitacao_id?: string
          status_espera?: string | null
          tipo_rota?: string
        }
        Relationships: [
          {
            foreignKeyName: "rotas_regulacao_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rotas_regulacao_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      sigtap_procedimentos: {
        Row: {
          ativo: boolean | null
          beneficiario: string
          cnrac: boolean | null
          codigo: string
          created_at: string | null
          data_vigencia: string | null
          descricao: string
          id: number
          portaria_referencia: string | null
          subtipo: string | null
          tipo: string
          unidade_medida: string | null
          updated_at: string | null
          valor_unitario: number
        }
        Insert: {
          ativo?: boolean | null
          beneficiario: string
          cnrac?: boolean | null
          codigo: string
          created_at?: string | null
          data_vigencia?: string | null
          descricao: string
          id?: number
          portaria_referencia?: string | null
          subtipo?: string | null
          tipo: string
          unidade_medida?: string | null
          updated_at?: string | null
          valor_unitario: number
        }
        Update: {
          ativo?: boolean | null
          beneficiario?: string
          cnrac?: boolean | null
          codigo?: string
          created_at?: string | null
          data_vigencia?: string | null
          descricao?: string
          id?: number
          portaria_referencia?: string | null
          subtipo?: string | null
          tipo?: string
          unidade_medida?: string | null
          updated_at?: string | null
          valor_unitario?: number
        }
        Relationships: []
      }
      solicitacao_acompanhantes: {
        Row: {
          acompanhante_id: string
          created_at: string | null
          id: string
          principal: boolean | null
          solicitacao_id: string
        }
        Insert: {
          acompanhante_id: string
          created_at?: string | null
          id?: string
          principal?: boolean | null
          solicitacao_id: string
        }
        Update: {
          acompanhante_id?: string
          created_at?: string | null
          id?: string
          principal?: boolean | null
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitacao_acompanhantes_acompanhante_id_fkey"
            columns: ["acompanhante_id"]
            isOneToOne: false
            referencedRelation: "acompanhantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacao_acompanhantes_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitacoes: {
        Row: {
          analista_responsavel_id: string | null
          atendente_criador_id: string | null
          carater_atendimento: string | null
          cid10_principal: string | null
          cid10_secundario: string | null
          created_at: string | null
          data_encerramento: string | null
          data_laudo: string | null
          data_validade_laudo: string | null
          descricao_diagnostico: string | null
          descricao_excecao: string | null
          especialidade: string | null
          flag_excecao: boolean | null
          id: string
          justificativa_tfd: string | null
          medico_solicitante_crm: string | null
          medico_solicitante_nome: string | null
          medico_solicitante_uf: string | null
          modalidade: string | null
          motivo_encerramento: string | null
          municipio_origem_id: string | null
          necessidade_acompanhante: boolean | null
          numero_processo: string
          numero_protocolo: string | null
          origem_laudo: string | null
          paciente_id: string
          prioridade: string | null
          regional_origem_id: string | null
          setor_atual: string | null
          status: string
          tipo_procedimento: string | null
          tipo_solicitacao: string
          tipo_transporte_sugerido: string | null
          updated_at: string | null
          url_sei: string | null
        }
        Insert: {
          analista_responsavel_id?: string | null
          atendente_criador_id?: string | null
          carater_atendimento?: string | null
          cid10_principal?: string | null
          cid10_secundario?: string | null
          created_at?: string | null
          data_encerramento?: string | null
          data_laudo?: string | null
          data_validade_laudo?: string | null
          descricao_diagnostico?: string | null
          descricao_excecao?: string | null
          especialidade?: string | null
          flag_excecao?: boolean | null
          id?: string
          justificativa_tfd?: string | null
          medico_solicitante_crm?: string | null
          medico_solicitante_nome?: string | null
          medico_solicitante_uf?: string | null
          modalidade?: string | null
          motivo_encerramento?: string | null
          municipio_origem_id?: string | null
          necessidade_acompanhante?: boolean | null
          numero_processo: string
          numero_protocolo?: string | null
          origem_laudo?: string | null
          paciente_id: string
          prioridade?: string | null
          regional_origem_id?: string | null
          setor_atual?: string | null
          status?: string
          tipo_procedimento?: string | null
          tipo_solicitacao?: string
          tipo_transporte_sugerido?: string | null
          updated_at?: string | null
          url_sei?: string | null
        }
        Update: {
          analista_responsavel_id?: string | null
          atendente_criador_id?: string | null
          carater_atendimento?: string | null
          cid10_principal?: string | null
          cid10_secundario?: string | null
          created_at?: string | null
          data_encerramento?: string | null
          data_laudo?: string | null
          data_validade_laudo?: string | null
          descricao_diagnostico?: string | null
          descricao_excecao?: string | null
          especialidade?: string | null
          flag_excecao?: boolean | null
          id?: string
          justificativa_tfd?: string | null
          medico_solicitante_crm?: string | null
          medico_solicitante_nome?: string | null
          medico_solicitante_uf?: string | null
          modalidade?: string | null
          motivo_encerramento?: string | null
          municipio_origem_id?: string | null
          necessidade_acompanhante?: boolean | null
          numero_processo?: string
          numero_protocolo?: string | null
          origem_laudo?: string | null
          paciente_id?: string
          prioridade?: string | null
          regional_origem_id?: string | null
          setor_atual?: string | null
          status?: string
          tipo_procedimento?: string | null
          tipo_solicitacao?: string
          tipo_transporte_sugerido?: string | null
          updated_at?: string | null
          url_sei?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solicitacoes_analista_responsavel_id_fkey"
            columns: ["analista_responsavel_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_atendente_criador_id_fkey"
            columns: ["atendente_criador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_municipio_origem_id_fkey"
            columns: ["municipio_origem_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "pacientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitacoes_regional_origem_id_fkey"
            columns: ["regional_origem_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      tabela_diarias: {
        Row: {
          created_at: string | null
          data_vigencia_fim: string | null
          data_vigencia_inicio: string
          id: string
          referencia_legal: string | null
          tipo_beneficiario: string | null
          valor_diaria: number
        }
        Insert: {
          created_at?: string | null
          data_vigencia_fim?: string | null
          data_vigencia_inicio: string
          id?: string
          referencia_legal?: string | null
          tipo_beneficiario?: string | null
          valor_diaria: number
        }
        Update: {
          created_at?: string | null
          data_vigencia_fim?: string | null
          data_vigencia_inicio?: string
          id?: string
          referencia_legal?: string | null
          tipo_beneficiario?: string | null
          valor_diaria?: number
        }
        Relationships: []
      }
      tabelas_auxiliares: {
        Row: {
          ativo: boolean | null
          categoria: string
          codigo: string
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          tipo_sistema: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria: string
          codigo: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          tipo_sistema?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          tipo_sistema?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      telas_sistema: {
        Row: {
          acoes_disponiveis: string[] | null
          id: string
          modulo: string
          nome: string
          ordem: number | null
          rota: string
        }
        Insert: {
          acoes_disponiveis?: string[] | null
          id: string
          modulo: string
          nome: string
          ordem?: number | null
          rota: string
        }
        Update: {
          acoes_disponiveis?: string[] | null
          id?: string
          modulo?: string
          nome?: string
          ordem?: number | null
          rota?: string
        }
        Relationships: []
      }
      tentativas_agendamento: {
        Row: {
          contato_unidade: string | null
          created_at: string
          data_agendamento: string | null
          data_contato: string
          hora_agendamento: string | null
          id: string
          observacao: string | null
          observacoes_chegada: string | null
          registrado_por: string | null
          resultado: string
          solicitacao_id: string
          tipo_procedimento: string | null
          unidade_id: string | null
          unidade_nome: string
        }
        Insert: {
          contato_unidade?: string | null
          created_at?: string
          data_agendamento?: string | null
          data_contato?: string
          hora_agendamento?: string | null
          id?: string
          observacao?: string | null
          observacoes_chegada?: string | null
          registrado_por?: string | null
          resultado: string
          solicitacao_id: string
          tipo_procedimento?: string | null
          unidade_id?: string | null
          unidade_nome: string
        }
        Update: {
          contato_unidade?: string | null
          created_at?: string
          data_agendamento?: string | null
          data_contato?: string
          hora_agendamento?: string | null
          id?: string
          observacao?: string | null
          observacoes_chegada?: string | null
          registrado_por?: string | null
          resultado?: string
          solicitacao_id?: string
          tipo_procedimento?: string | null
          unidade_id?: string | null
          unidade_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "tentativas_agendamento_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tentativas_agendamento_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tentativas_agendamento_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades_destino"
            referencedColumns: ["id"]
          },
        ]
      }
      termos_compromisso: {
        Row: {
          arquivo_nome: string | null
          arquivo_url: string | null
          confirmacao_leitura: boolean | null
          created_at: string
          data_registro: string
          id: string
          local_registro: string | null
          modalidade_aceite: string
          numero_processo: string
          paciente_cns: string | null
          paciente_cpf: string
          paciente_endereco: string | null
          paciente_municipio: string | null
          paciente_nome: string
          paciente_rg: string | null
          registrado_por: string | null
          responsavel_cpf: string | null
          responsavel_nome: string | null
          responsavel_parentesco: string | null
          solicitacao_id: string
          status: string
          updated_at: string
        }
        Insert: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          confirmacao_leitura?: boolean | null
          created_at?: string
          data_registro?: string
          id?: string
          local_registro?: string | null
          modalidade_aceite: string
          numero_processo: string
          paciente_cns?: string | null
          paciente_cpf: string
          paciente_endereco?: string | null
          paciente_municipio?: string | null
          paciente_nome: string
          paciente_rg?: string | null
          registrado_por?: string | null
          responsavel_cpf?: string | null
          responsavel_nome?: string | null
          responsavel_parentesco?: string | null
          solicitacao_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          arquivo_nome?: string | null
          arquivo_url?: string | null
          confirmacao_leitura?: boolean | null
          created_at?: string
          data_registro?: string
          id?: string
          local_registro?: string | null
          modalidade_aceite?: string
          numero_processo?: string
          paciente_cns?: string | null
          paciente_cpf?: string
          paciente_endereco?: string | null
          paciente_municipio?: string | null
          paciente_nome?: string
          paciente_rg?: string | null
          registrado_por?: string | null
          responsavel_cpf?: string | null
          responsavel_nome?: string | null
          responsavel_parentesco?: string | null
          solicitacao_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "termos_compromisso_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "termos_compromisso_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: true
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades_destino: {
        Row: {
          ativo: boolean | null
          bairro: string | null
          cep: string | null
          cidade: string
          cnes: string | null
          contato_email: string | null
          contato_nome: string | null
          contato_telefone: string | null
          created_at: string | null
          email: string | null
          endereco: string | null
          id: string
          logradouro: string | null
          municipio: string | null
          nome: string
          numero: string | null
          regional_id: string | null
          regional_saude_id: string | null
          responsavel: string | null
          telefone: string | null
          tipo: string | null
          uf: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade: string
          cnes?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          nome: string
          numero?: string | null
          regional_id?: string | null
          regional_saude_id?: string | null
          responsavel?: string | null
          telefone?: string | null
          tipo?: string | null
          uf: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          bairro?: string | null
          cep?: string | null
          cidade?: string
          cnes?: string | null
          contato_email?: string | null
          contato_nome?: string | null
          contato_telefone?: string | null
          created_at?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logradouro?: string | null
          municipio?: string | null
          nome?: string
          numero?: string | null
          regional_id?: string | null
          regional_saude_id?: string | null
          responsavel?: string | null
          telefone?: string | null
          tipo?: string | null
          uf?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unidades_destino_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "tabelas_auxiliares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidades_destino_regional_saude_id_fkey"
            columns: ["regional_saude_id"]
            isOneToOne: false
            referencedRelation: "regionais_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          cpf: string
          created_at: string | null
          crm: string | null
          crm_uf: string | null
          descricao: string | null
          email: string
          especialidade_medica: string | null
          foto_url: string | null
          id: string
          is_admin: boolean | null
          municipio_id: string | null
          nome_completo: string
          papel_id: string | null
          perfil: string
          primeiro_acesso: boolean | null
          regional_id: string | null
          telefones: string[] | null
          ultimo_acesso: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf: string
          created_at?: string | null
          crm?: string | null
          crm_uf?: string | null
          descricao?: string | null
          email: string
          especialidade_medica?: string | null
          foto_url?: string | null
          id?: string
          is_admin?: boolean | null
          municipio_id?: string | null
          nome_completo: string
          papel_id?: string | null
          perfil: string
          primeiro_acesso?: boolean | null
          regional_id?: string | null
          telefones?: string[] | null
          ultimo_acesso?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string
          created_at?: string | null
          crm?: string | null
          crm_uf?: string | null
          descricao?: string | null
          email?: string
          especialidade_medica?: string | null
          foto_url?: string | null
          id?: string
          is_admin?: boolean | null
          municipio_id?: string | null
          nome_completo?: string
          papel_id?: string | null
          perfil?: string
          primeiro_acesso?: boolean | null
          regional_id?: string | null
          telefones?: string[] | null
          ultimo_acesso?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_municipio_id_fkey"
            columns: ["municipio_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_papel_id_fkey"
            columns: ["papel_id"]
            isOneToOne: false
            referencedRelation: "papeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_regional_id_fkey"
            columns: ["regional_id"]
            isOneToOne: false
            referencedRelation: "municipios"
            referencedColumns: ["id"]
          },
        ]
      }
      validacoes_rpb: {
        Row: {
          consistente: boolean | null
          created_at: string | null
          id: string
          observacoes: string | null
          periodo_agendamento_fim: string | null
          periodo_agendamento_inicio: string | null
          periodo_parecer_fim: string | null
          periodo_parecer_inicio: string | null
          rota_regulacao_id: string
        }
        Insert: {
          consistente?: boolean | null
          created_at?: string | null
          id?: string
          observacoes?: string | null
          periodo_agendamento_fim?: string | null
          periodo_agendamento_inicio?: string | null
          periodo_parecer_fim?: string | null
          periodo_parecer_inicio?: string | null
          rota_regulacao_id: string
        }
        Update: {
          consistente?: boolean | null
          created_at?: string | null
          id?: string
          observacoes?: string | null
          periodo_agendamento_fim?: string | null
          periodo_agendamento_inicio?: string | null
          periodo_parecer_fim?: string | null
          periodo_parecer_inicio?: string | null
          rota_regulacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validacoes_rpb_rota_regulacao_id_fkey"
            columns: ["rota_regulacao_id"]
            isOneToOne: false
            referencedRelation: "rotas_regulacao"
            referencedColumns: ["id"]
          },
        ]
      }
      viagens: {
        Row: {
          ativa: boolean
          codigo_transfer: string | null
          com_pernoite: boolean | null
          companhia: string | null
          created_at: string | null
          data_cancelamento: string | null
          data_embarque_prevista: string
          data_embarque_real: string | null
          data_reembolso: string | null
          destino_cidade: string
          destino_uf: string
          distancia_unidade: string | null
          distancia_valor: number | null
          embarcou: boolean | null
          embarcou_registrado_em: string | null
          embarcou_registrado_por: string | null
          emissor_id: string | null
          emitido_em: string | null
          id: string
          medif_descricao: string | null
          medif_necessario: boolean | null
          modal: string
          motivo_cancelamento: string | null
          motivo_cancelamento_texto: string | null
          numero_bilhete: string | null
          numero_sequencial: number | null
          observacoes: string | null
          origem_cidade: string
          origem_uf: string
          prorrogacao_id: string | null
          situacao: string | null
          solicitacao_id: string
          status_operacional_id: string | null
          taxas: number | null
          tipo: string
          updated_at: string | null
          valor: number | null
          valor_ajuda_custo_acompanhante: number | null
          valor_ajuda_custo_paciente: number | null
          valor_reembolso: number | null
          viagem_anterior_id: string | null
        }
        Insert: {
          ativa?: boolean
          codigo_transfer?: string | null
          com_pernoite?: boolean | null
          companhia?: string | null
          created_at?: string | null
          data_cancelamento?: string | null
          data_embarque_prevista: string
          data_embarque_real?: string | null
          data_reembolso?: string | null
          destino_cidade: string
          destino_uf: string
          distancia_unidade?: string | null
          distancia_valor?: number | null
          embarcou?: boolean | null
          embarcou_registrado_em?: string | null
          embarcou_registrado_por?: string | null
          emissor_id?: string | null
          emitido_em?: string | null
          id?: string
          medif_descricao?: string | null
          medif_necessario?: boolean | null
          modal: string
          motivo_cancelamento?: string | null
          motivo_cancelamento_texto?: string | null
          numero_bilhete?: string | null
          numero_sequencial?: number | null
          observacoes?: string | null
          origem_cidade: string
          origem_uf: string
          prorrogacao_id?: string | null
          situacao?: string | null
          solicitacao_id: string
          status_operacional_id?: string | null
          taxas?: number | null
          tipo: string
          updated_at?: string | null
          valor?: number | null
          valor_ajuda_custo_acompanhante?: number | null
          valor_ajuda_custo_paciente?: number | null
          valor_reembolso?: number | null
          viagem_anterior_id?: string | null
        }
        Update: {
          ativa?: boolean
          codigo_transfer?: string | null
          com_pernoite?: boolean | null
          companhia?: string | null
          created_at?: string | null
          data_cancelamento?: string | null
          data_embarque_prevista?: string
          data_embarque_real?: string | null
          data_reembolso?: string | null
          destino_cidade?: string
          destino_uf?: string
          distancia_unidade?: string | null
          distancia_valor?: number | null
          embarcou?: boolean | null
          embarcou_registrado_em?: string | null
          embarcou_registrado_por?: string | null
          emissor_id?: string | null
          emitido_em?: string | null
          id?: string
          medif_descricao?: string | null
          medif_necessario?: boolean | null
          modal?: string
          motivo_cancelamento?: string | null
          motivo_cancelamento_texto?: string | null
          numero_bilhete?: string | null
          numero_sequencial?: number | null
          observacoes?: string | null
          origem_cidade?: string
          origem_uf?: string
          prorrogacao_id?: string | null
          situacao?: string | null
          solicitacao_id?: string
          status_operacional_id?: string | null
          taxas?: number | null
          tipo?: string
          updated_at?: string | null
          valor?: number | null
          valor_ajuda_custo_acompanhante?: number | null
          valor_ajuda_custo_paciente?: number | null
          valor_reembolso?: number | null
          viagem_anterior_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "viagens_embarcou_registrado_por_fkey"
            columns: ["embarcou_registrado_por"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_emissor_id_fkey"
            columns: ["emissor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_prorrogacao_id_fkey"
            columns: ["prorrogacao_id"]
            isOneToOne: false
            referencedRelation: "prorrogacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_status_operacional_id_fkey"
            columns: ["status_operacional_id"]
            isOneToOne: false
            referencedRelation: "tabelas_auxiliares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viagens_viagem_anterior_id_fkey"
            columns: ["viagem_anterior_id"]
            isOneToOne: false
            referencedRelation: "viagens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_email_by_cpf: { Args: { p_cpf: string }; Returns: string }
      has_permission: {
        Args: { p_acao: string; p_tela: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      obter_relatorio_financeiro: { Args: { p_ano: number }; Returns: Json }
      setor_atual_from_status: { Args: { status_in: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
