import { useState, useEffect, useRef } from 'react';
import { getRules, addRule, updateRule, deleteRule, exportData, importData } from '../../shared/storage';
import type { Rule, StorageData } from '../../shared/types';

export default function App() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [newType, setNewType] = useState<Rule['type']>('domain_equals');
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getRules().then(setRules);
  }, []);

  async function handleAdd() {
    if (!newValue.trim()) return;
    const rule = await addRule({ type: newType, value: newValue.trim() });
    setRules(prev => [...prev, rule]);
    setNewValue('');
  }

  async function handleDelete(id: string) {
    await deleteRule(id);
    setRules(prev => prev.filter(r => r.id !== id));
  }

  function startEdit(rule: Rule) {
    setEditingId(rule.id);
    setEditingValue(rule.value);
  }

  async function confirmEdit(id: string) {
    if (!editingValue.trim()) return;
    await updateRule(id, { value: editingValue.trim() });
    setRules(prev => prev.map(r => r.id === id ? { ...r, value: editingValue.trim() } : r));
    setEditingId(null);
  }

  async function handleExport() {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pathpin-data.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data: StorageData = JSON.parse(text);
      await importData(data);
      const updated = await getRules();
      setRules(updated);
      setImportStatus('Import successful');
    } catch {
      setImportStatus('Import failed: invalid file');
    }
    e.target.value = '';
    setTimeout(() => setImportStatus(''), 3000);
  }

  return (
    <div style={s.page}>
      <h1 style={s.title}>PathPin</h1>

      <p style={s.hint}>Show widget on pages matching any rule.</p>

      {rules.length === 0 ? (
        <p style={s.empty}>No rules yet.</p>
      ) : (
        <ul style={s.list}>
          {rules.map(rule => (
            <li key={rule.id} style={s.item}>
              <span style={s.badge}>{rule.type === 'url_contains' ? 'URL:co' : 'Dom:eq'}</span>
              {editingId === rule.id ? (
                <input
                  style={s.editInput}
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmEdit(rule.id); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                />
              ) : (
                <span style={s.value}>{rule.value}</span>
              )}
              <div style={s.actions}>
                {editingId === rule.id ? (
                  <button style={s.btn} onClick={() => confirmEdit(rule.id)}>Save</button>
                ) : (
                  <button style={s.btn} onClick={() => startEdit(rule)}>Edit</button>
                )}
                <button style={{ ...s.btn, ...s.btnDanger }} onClick={() => handleDelete(rule.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div style={s.addRow}>
        <select style={s.select} value={newType} onChange={e => setNewType(e.target.value as Rule['type'])}>
          <option value="domain_equals">Domain equals</option>
          <option value="url_contains">URL contains</option>
        </select>
        <input
          style={s.input}
          placeholder="e.g. localhost"
          value={newValue}
          onChange={e => setNewValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
        />
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleAdd}>Add</button>
      </div>

      <hr style={s.divider} />

      <div style={s.dataRow}>
        <button style={{ ...s.btn, ...s.btnPrimary }} onClick={handleExport}>Export</button>
        <button style={s.btn} onClick={() => fileInputRef.current?.click()}>Import</button>
        <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />
      </div>
      {importStatus && <p style={s.status}>{importStatus}</p>}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { width: 320, padding: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', color: '#111827' },
  title: { fontSize: 18, fontWeight: 600, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: 600, marginBottom: 4 },
  hint: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  empty: { fontSize: 12, color: '#9ca3af', marginBottom: 12 },
  list: { listStyle: 'none', padding: 0, margin: '0 0 12px' },
  item: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: '1px solid #f3f4f6' },
  badge: { fontSize: 10, background: '#e0e7ff', color: '#4338ca', borderRadius: 4, padding: '2px 5px', flexShrink: 0 },
  value: { flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 },
  editInput: { flex: 1, fontSize: 12, border: '1px solid #6366f1', borderRadius: 4, padding: '2px 6px', outline: 'none' },
  actions: { display: 'flex', gap: 4 },
  addRow: { display: 'flex', gap: 6, alignItems: 'center' },
  select: { fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 6px', outline: 'none' },
  input: { flex: 1, fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, padding: '5px 6px', outline: 'none', minWidth: 0 },
  btn: { fontSize: 11, border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', background: '#fff', whiteSpace: 'nowrap' },
  btnPrimary: { background: '#6366f1', color: '#fff', border: 'none' },
  btnDanger: { color: '#ef4444', borderColor: '#fca5a5' },
  divider: { border: 'none', borderTop: '1px solid #f3f4f6', margin: '16px 0' },
  dataRow: { display: 'flex', gap: 8 },
  status: { fontSize: 11, color: '#6b7280', marginTop: 8 },
};
