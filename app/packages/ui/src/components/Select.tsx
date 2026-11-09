'use client';

import { type KeyboardEvent, useId, useLayoutEffect, useRef, useState } from 'react';
import { cx } from '../cx';
import { Icon } from './Icon';
import styles from './Select.module.css';

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

const EDGE_MARGIN = 8;
const TYPEAHEAD_RESET_MS = 500;

/**
 * A dropdown styled like the rest of the app, because browsers draw a native <select> list
 * themselves. Follows the WAI-ARIA select-only combobox: focus stays on the button, and arrows,
 * Home, End, Enter, Space, Esc, Tab and typing the first letters all work.
 */
export function Select<T extends string>({ label, value, options, onChange }: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const id = useId();
  const labelId = `${id}-label`;
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const typed = useRef({ text: '', at: 0 });

  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  const last = options.length - 1;

  // Keep the list on screen. It's a new element on every opening, so nothing needs resetting.
  useLayoutEffect(() => {
    const popup = list.current;
    const trigger = button.current;
    if (!open || !popup || !trigger) return;
    const box = popup.getBoundingClientRect();
    if (box.right > window.innerWidth - EDGE_MARGIN) popup.dataset.alignEnd = '';
    const roomAbove = trigger.getBoundingClientRect().top - EDGE_MARGIN;
    if (box.bottom > window.innerHeight - EDGE_MARGIN && box.height < roomAbove) {
      popup.dataset.above = '';
    }
  }, [open]);

  const openAt = (index: number) => {
    setActive(index);
    setOpen(true);
  };

  const choose = (index: number) => {
    setOpen(false);
    const option = options[index];
    if (option && option.value !== value) onChange(option.value);
  };

  /** The option starting with what was just typed, or -1. */
  const typeahead = (key: string) => {
    const now = Date.now();
    const previous = now - typed.current.at < TYPEAHEAD_RESET_MS ? typed.current.text : '';
    const text = previous + key.toLowerCase();
    typed.current = { text, at: now };
    return options.findIndex((option) => option.label.toLowerCase().startsWith(text));
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const { key } = event;
    const isCharacter = key.length === 1 && key !== ' ' && !event.ctrlKey && !event.metaKey;

    if (key === 'Tab') {
      // Moving on keeps the option in focus, like a native select.
      if (open) choose(active);
      return;
    }
    if (isCharacter) {
      const match = typeahead(key);
      if (match >= 0) openAt(match);
      return;
    }

    const handled = open
      ? {
          ArrowDown: () => setActive(Math.min(active + 1, last)),
          ArrowUp: () => setActive(Math.max(active - 1, 0)),
          Home: () => setActive(0),
          End: () => setActive(last),
          Enter: () => choose(active),
          ' ': () => choose(active),
          Escape: () => setOpen(false),
        }[key]
      : {
          ArrowDown: () => openAt(selected),
          ArrowUp: () => openAt(selected),
          Home: () => openAt(0),
          End: () => openAt(last),
          Enter: () => openAt(selected),
          ' ': () => openAt(selected),
        }[key];
    if (handled) {
      event.preventDefault();
      handled();
    }
  };

  return (
    <div className={styles.root}>
      <button
        ref={button}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={labelId}
        aria-activedescendant={open ? optionId(active) : undefined}
        className={styles.trigger}
        onClick={(event) => {
          // Safari doesn't focus a clicked button, and closing on blur relies on it.
          event.currentTarget.focus();
          if (open) setOpen(false);
          else openAt(selected);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setOpen(false)}
      >
        <span id={labelId} className={styles.label}>
          {label}
        </span>
        <span className={styles.value}>{options[selected]?.label}</span>
        <Icon name="expand_more" size={20} className={styles.chevron} />
      </button>
      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          aria-labelledby={labelId}
          className={styles.list}
          // Keeps focus on the button, so picking an option doesn't count as leaving.
          onMouseDown={(event) => event.preventDefault()}
        >
          {options.map((option, index) => (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={index === selected}
              className={cx(
                styles.option,
                index === active && styles.active,
                index === selected && styles.selected,
              )}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              {option.label}
              {index === selected && <Icon name="check" size={18} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
