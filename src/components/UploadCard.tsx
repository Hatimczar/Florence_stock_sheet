'use client';

import { useRef, useState } from 'react';
import { Upload, X, CheckCircle2 } from 'lucide-react';
import { parseFile, guessPartNumberColumn, guessDescriptionColumn, guessCategoryColumn } from '@/lib/parseFile';
import { ListMapping } from '@/lib/merge';
import { StoredList } from '@/lib/api';

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="field-row">
      <label>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          font: 'inherit',
          fontSize: 14,
          border: 'none',
          background: 'transparent',
          color: 'var(--foreground)',
          padding: 0,
          appearance: 'none',
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: 'var(--surface)', color: 'var(--foreground)' }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function UploadCard({
  step,
  title,
  valueLabel,
  valueGuess,
  listState,
  onFileParsed,
  onMappingChange,
  onClear,
}: {
  step: string;
  title: string;
  valueLabel: string;
  valueGuess: (headers: string[]) => string | null;
  listState: StoredList | null;
  onFileParsed: (file: StoredList['file'], mapping: ListMapping) => Promise<void>;
  onMappingChange: (mapping: Partial<ListMapping>) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const parsed = await parseFile(file);
      if (parsed.headers.length === 0) {
        setError('No columns found in this file — is it empty?');
        return;
      }
      const mapping: ListMapping = {
        partNumberCol: guessPartNumberColumn(parsed.headers) || parsed.headers[0],
        valueCol: valueGuess(parsed.headers) || parsed.headers[1] || parsed.headers[0],
        descriptionCol: guessDescriptionColumn(parsed.headers),
        categoryCol: guessCategoryColumn(parsed.headers),
      };
      await onFileParsed(parsed, mapping);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read or upload this file.');
    } finally {
      setBusy(false);
    }
  };

  const handleMappingChange = async (patch: Partial<ListMapping>) => {
    setError(null);
    try {
      await onMappingChange(patch);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save mapping change.');
    }
  };

  const columnOptions = (headers: string[]) => headers.map((h) => ({ value: h, label: h }));
  const noneOption = { value: '', label: '— None —' };

  return (
    <div>
      <div className="section-header">
        {step} {title}
      </div>
      <div className="card">
        {!listState ? (
          <div
            className="dropzone"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <Upload style={{ display: 'block', margin: '0 auto 6px' }} />
            <div>{busy ? 'Uploading…' : 'Drag & drop, or click to choose a file'}</div>
            <div style={{ marginTop: 4, fontSize: 11, opacity: 0.7 }}>.xlsx, .xls, or .csv</div>
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.numbers"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </div>
        ) : (
          <>
            <div className="row">
              <div className="row-icon" style={{ background: 'var(--profit)' }}>
                <CheckCircle2 />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row-title">{listState.file.fileName}</div>
                <div className="row-sub">
                  {listState.file.rows.length} rows · Updated {new Date(listState.uploadedAt).toLocaleTimeString()}
                </div>
              </div>
              <button className="link-btn" onClick={() => inputRef.current?.click()}>
                Replace
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.numbers"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
              <button className="link-btn" onClick={() => onClear()} aria-label="Clear">
                <X size={14} />
              </button>
            </div>
            <FieldSelect
              label="Part Number Column"
              value={listState.mapping.partNumberCol}
              onChange={(v) => handleMappingChange({ partNumberCol: v })}
              options={columnOptions(listState.file.headers)}
            />
            <FieldSelect
              label={`${valueLabel} Column`}
              value={listState.mapping.valueCol}
              onChange={(v) => handleMappingChange({ valueCol: v })}
              options={columnOptions(listState.file.headers)}
            />
            <FieldSelect
              label="Description Column (optional)"
              value={listState.mapping.descriptionCol || ''}
              onChange={(v) => handleMappingChange({ descriptionCol: v || null })}
              options={[noneOption, ...columnOptions(listState.file.headers)]}
            />
            <FieldSelect
              label="Category Column (optional)"
              value={listState.mapping.categoryCol || ''}
              onChange={(v) => handleMappingChange({ categoryCol: v || null })}
              options={[noneOption, ...columnOptions(listState.file.headers)]}
            />
          </>
        )}
      </div>
      {error && (
        <p style={{ marginTop: -8, marginBottom: 16, fontSize: 12, color: 'var(--loss)' }}>{error}</p>
      )}
    </div>
  );
}
