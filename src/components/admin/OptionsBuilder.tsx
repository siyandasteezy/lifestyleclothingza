"use client";

import { useMemo, useState } from "react";
import { adminInput, Label } from "@/components/admin/ui";

const MAX_OPTIONS = 3;

interface OptionRow {
  id: number;
  name: string;
  values: string;
}

/**
 * Dynamic option list (Size, Color, …) with live preview of the resulting
 * variants. Values are comma-separated. Emits hidden `option-<i>-name` and
 * `option-<i>-values` inputs so the outer form action reads them without JS.
 */
export function OptionsBuilder({
  optionNameSuggestions,
}: {
  optionNameSuggestions: string[];
}) {
  const [rows, setRows] = useState<OptionRow[]>([]);
  const [nextId, setNextId] = useState(1);

  const preview = useMemo(() => {
    const filled = rows
      .map((r) => ({
        name: r.name.trim(),
        values: r.values.split(",").map((v) => v.trim()).filter(Boolean),
      }))
      .filter((r) => r.name && r.values.length > 0);
    if (filled.length === 0) return { titles: ["Default Title"], count: 1 };
    let combos: string[][] = [[]];
    for (const opt of filled) {
      const next: string[][] = [];
      for (const combo of combos) for (const v of opt.values) next.push([...combo, v]);
      combos = next;
    }
    return {
      titles: combos.map((c) => c.join(" / ")),
      count: combos.length,
    };
  }, [rows]);

  const addRow = () => {
    if (rows.length >= MAX_OPTIONS) return;
    setRows((r) => [...r, { id: nextId, name: "", values: "" }]);
    setNextId((n) => n + 1);
  };
  const removeRow = (id: number) => setRows((r) => r.filter((row) => row.id !== id));
  const patchRow = (id: number, patch: Partial<OptionRow>) =>
    setRows((r) => r.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  return (
    <div className="space-y-4">
      <p className="text-xs text-stone">
        Add options like <strong className="text-ink">Size</strong> or{" "}
        <strong className="text-ink">Colour</strong> if this product comes in variations. Leave
        empty for a single-variant product.
      </p>

      <datalist id="option-name-suggestions">
        {optionNameSuggestions.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>

      {rows.map((row, i) => (
        <div key={row.id} className="grid gap-3 border border-line bg-bone p-3 sm:grid-cols-[10rem_1fr_auto]">
          <div>
            <Label htmlFor={`opt-name-${row.id}`}>Option name</Label>
            <input
              id={`opt-name-${row.id}`}
              name={`option-${i}-name`}
              list="option-name-suggestions"
              value={row.name}
              onChange={(e) => patchRow(row.id, { name: e.target.value })}
              placeholder="e.g. Size"
              className={adminInput}
            />
          </div>
          <div>
            <Label htmlFor={`opt-values-${row.id}`}>Values (comma-separated)</Label>
            <input
              id={`opt-values-${row.id}`}
              name={`option-${i}-values`}
              value={row.values}
              onChange={(e) => patchRow(row.id, { values: e.target.value })}
              placeholder="e.g. XS, S, M, L, XL"
              className={adminInput}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => removeRow(row.id)}
              className="h-10 px-3 text-sm text-clay hover:text-clay-deep"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      {rows.length < MAX_OPTIONS && (
        <button
          type="button"
          onClick={addRow}
          className="border border-dashed border-line px-4 py-2 text-sm text-ink-soft hover:border-ink hover:text-ink"
        >
          + Add option
        </button>
      )}

      {/* Live variant preview */}
      <div className="border-t border-line pt-4">
        <p className="text-xs tracking-[0.15em] uppercase text-stone">
          Variants that will be created ({preview.count})
        </p>
        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-soft">
          {preview.titles.slice(0, 40).map((t, i) => (
            <li key={i} className="tabular-nums">
              {t}
            </li>
          ))}
          {preview.count > 40 && <li className="text-stone">… +{preview.count - 40} more</li>}
        </ul>
        <p className="mt-3 text-xs text-stone">
          You’ll be able to fine-tune each variant’s price and stock after saving.
        </p>
      </div>
    </div>
  );
}
