'use client';

import { useId, useState } from 'react';
import {
  Select as SelectBase,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string> {
  /** Shown inside the control, before the value (e.g. "Sort:"). Also its accessible name. */
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
}

/** Radix doesn't allow an empty value, which "All" options use. */
const EMPTY = '__empty__';
const toItem = (value: string) => value || EMPTY;

export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  const labelId = `${useId()}-label`;
  const [usedPointer, setUsedPointer] = useState(false);
  const selected = options.find((option) => option.value === value) ?? options[0];
  return (
    <div className="relative inline-block max-w-full">
      <SelectBase
        value={toItem(value)}
        onValueChange={(item) => {
          const option = options.find((candidate) => toItem(candidate.value) === item);
          if (option && option.value !== value) onChange(option.value);
        }}
      >
        <SelectTrigger
          aria-labelledby={labelId}
          // Radix hands focus back here on closing, which browsers would show as a keyboard ring.
          data-pointer={usedPointer || undefined}
          className="data-pointer:outline-none"
          onPointerDown={() => setUsedPointer(true)}
          onKeyDown={() => setUsedPointer(false)}
        >
          <span id={labelId} className="text-ink3">
            {label}
          </span>
          {/* Given as children, so the server renders the value too. */}
          <span className="font-bold">
            <SelectValue>{selected?.label}</SelectValue>
          </span>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={toItem(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectBase>
    </div>
  );
}
