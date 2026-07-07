'use client';

import { useRef, useState } from 'react';
import { Upload, RefreshCw, X, CheckCircle2 } from 'lucide-react';
import { parseFile, guessPartNumberColumn, guessDescriptionColumn, guessCategoryColumn } from '@/lib/parseFile';
import { ListMapping } from '@/lib/merge';
import { StoredList } from '@/lib/api';
import { Card, SectionHeader, Field, SelectInput, Badge } from './ui';

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
    <Card>
      <SectionHeader
        step={step}
        title={title}
        subtitle={listState ? `Updated ${new Date(listState.uploadedAt).toLocaleString()}` : 'No file uploaded yet'}
      />

      {!listState ? (
        <div
          className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-muted p-8 text-center"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
        >
          <Upload size={26} className="mb-2 text-muted" />
          <p className="text-sm text-foreground">{busy ? 'Uploading…' : 'Drag & drop, or click to choose a file'}</p>
          <p className="mt-1 text-xs text-muted">.xlsx, .xls, or .csv</p>
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
        <div>
          <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-surface-muted px-3 py-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} className="text-profit" />
              <span className="font-medium">{listState.file.fileName}</span>
              <Badge tone="accent">{listState.file.rows.length} rows</Badge>
              {busy && <span className="text-xs text-muted">Uploading…</span>}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => inputRef.current?.click()}
                className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs hover:bg-surface"
              >
                <RefreshCw size={13} /> Replace
              </button>
              <button onClick={() => onClear()} className="rounded-lg border border-border p-1 text-xs hover:bg-surface">
                <X size={13} />
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
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Part Number Column">
              <SelectInput
                value={listState.mapping.partNumberCol}
                onValueChange={(v) => handleMappingChange({ partNumberCol: v })}
                options={columnOptions(listState.file.headers)}
              />
            </Field>
            <Field label={`${valueLabel} Column`}>
              <SelectInput
                value={listState.mapping.valueCol}
                onValueChange={(v) => handleMappingChange({ valueCol: v })}
                options={columnOptions(listState.file.headers)}
              />
            </Field>
            <Field label="Description Column (optional)">
              <SelectInput
                value={listState.mapping.descriptionCol || ''}
                onValueChange={(v) => handleMappingChange({ descriptionCol: v || null })}
                options={[noneOption, ...columnOptions(listState.file.headers)]}
              />
            </Field>
            <Field label="Category Column (optional)">
              <SelectInput
                value={listState.mapping.categoryCol || ''}
                onValueChange={(v) => handleMappingChange({ categoryCol: v || null })}
                options={[noneOption, ...columnOptions(listState.file.headers)]}
              />
            </Field>
          </div>
        </div>
      )}

      {error && <div className="mt-3 rounded-xl border border-loss/30 bg-loss-bg p-3 text-sm text-loss">{error}</div>}
    </Card>
  );
}
