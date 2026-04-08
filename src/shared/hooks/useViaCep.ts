'use client';

import { useState, useEffect, useRef } from 'react';

interface EnderecoViaCep {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string; // cidade
  uf: string;
  ibge: string; // código IBGE do município
}

interface ViaCepResult {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  codigo_ibge: string;
}

// Cache em memória por CEP
const cache = new Map<string, ViaCepResult>();

/**
 * Hook que recebe CEP (8 dígitos), consulta ViaCEP e retorna dados de endereço.
 */
export function useViaCep(cep: string) {
  const [endereco, setEndereco] = useState<ViaCepResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const cepLimpo = cep.replace(/\D/g, '');

    if (cepLimpo.length !== 8) {
      setEndereco(null);
      setErro(null);
      return;
    }

    // Verificar cache
    const cached = cache.get(cepLimpo);
    if (cached) {
      setEndereco(cached);
      setErro(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErro(null);

    fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
      .then((res) => res.json())
      .then((data: EnderecoViaCep & { erro?: boolean }) => {
        if (!mountedRef.current) return;

        if (data.erro) {
          setErro('CEP não encontrado');
          setEndereco(null);
        } else {
          const resultado: ViaCepResult = {
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf,
            codigo_ibge: data.ibge,
          };
          cache.set(cepLimpo, resultado);
          setEndereco(resultado);
          setErro(null);
        }
        setIsLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setErro('Erro ao consultar CEP');
        setEndereco(null);
        setIsLoading(false);
      });
  }, [cep]);

  return { endereco, isLoading, erro };
}
