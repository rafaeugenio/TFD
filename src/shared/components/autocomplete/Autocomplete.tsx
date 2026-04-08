'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import FormField from '@/shared/components/drawer/FormField';

interface AutocompleteOption {
  value: string;
  label: string;
  [key: string]: unknown;
}

interface AutocompleteProps {
  label?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSearch: (query: string) => Promise<AutocompleteOption[]>;
  onSelect: (item: AutocompleteOption) => void;
  renderOption?: (item: AutocompleteOption) => React.ReactNode;
  disabled?: boolean;
  required?: boolean;
  size?: 'sm' | 'md';
}

export default function Autocomplete({
  label,
  placeholder = 'Buscar...',
  value,
  onChange,
  onSearch,
  onSelect,
  renderOption,
  disabled = false,
  required = false,
  size = 'md',
}: AutocompleteProps) {
  const [inputValue, setInputValue] = useState(value ?? '');
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync inputValue when value prop changes externally
  useEffect(() => {
    if (value !== undefined) {
      setInputValue(value);
    }
  }, [value]);

  // Click outside detection
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!inputValue.trim()) {
      setOptions([]);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await onSearch(inputValue);
        setOptions(results.slice(0, 20));
        setIsOpen(true);
        setHighlightedIndex(-1);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [inputValue, onSearch]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setInputValue(val);
      onChange?.(val);
    },
    [onChange],
  );

  const handleSelect = useCallback(
    (item: AutocompleteOption) => {
      setInputValue(item.label);
      setIsOpen(false);
      setHighlightedIndex(-1);
      onSelect(item);
    },
    [onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < options.length - 1 ? prev + 1 : 0,
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : options.length - 1,
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            handleSelect(options[highlightedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setHighlightedIndex(-1);
          break;
      }
    },
    [isOpen, options, highlightedIndex, handleSelect],
  );

  const inputClass = size === 'sm' ? 'tfd-input tfd-input--sm' : 'tfd-input';

  const inputElement = (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          className={inputClass}
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (options.length > 0) setIsOpen(true);
          }}
          disabled={disabled}
          autoComplete="off"
        />
        {loading && (
          <Loader2
            size={16}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--tfd-text-muted)',
              animation: 'spin 1s linear infinite',
            }}
          />
        )}
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: '4px',
            background: 'var(--tfd-surface-card)',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 'var(--tfd-radius-md)',
            boxShadow: 'var(--tfd-shadow-md)',
            maxHeight: '240px',
            overflowY: 'auto',
          }}
        >
          {options.length === 0 && !loading ? (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                fontSize: '0.875rem',
                color: 'var(--tfd-text-muted)',
              }}
            >
              Nenhum resultado encontrado
            </div>
          ) : (
            options.map((item, index) => (
              <div
                key={item.value}
                role="option"
                aria-selected={index === highlightedIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'background 150ms ease',
                  background:
                    index === highlightedIndex
                      ? 'var(--tfd-blue-50)'
                      : 'transparent',
                  color: 'var(--tfd-text-primary)',
                }}
              >
                {renderOption ? renderOption(item) : item.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );

  if (label) {
    return (
      <FormField label={label} required={required}>
        {inputElement}
      </FormField>
    );
  }

  return inputElement;
}

export type { AutocompleteOption, AutocompleteProps };
