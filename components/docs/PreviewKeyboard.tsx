'use client';

import { useState } from 'react';
import { Delete } from 'lucide-react';
import { Button } from '@plexui/ui/components/Button';
import { isPreviewKeyboardCommand, type PreviewKeyboardCommand, type PreviewKeyboardKind } from './previewKeyboardInput';
import s from './PreviewKeyboard.module.css';

export const NUMERIC_KEYBOARD_HEIGHT = 308;
// Docs adaptation: the reference's 207px keys and 78px bottom inset, plus the existing 24px top inset.
export const TEXT_KEYBOARD_HEIGHT = 309;
const keys = [['1', ''], ['2', 'ABC'], ['3', 'DEF'], ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'], ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ']] as const;
const letterRows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const numberRows = ['1234567890', '-/:;()$&@“', '.,?!‘'];
const symbolRows = ['[]{}#%^*+=', '_\\|~<>€£¥·', '.,?!‘'];
type KeyHandler = (key: PreviewKeyboardCommand) => void;

function TextKeyboard({ onKey }: { onKey: KeyHandler }) {
  const [layout, setLayout] = useState<'letters' | 'numbers' | 'symbols'>('letters');
  const [uppercase, setUppercase] = useState(false);
  const letters = layout === 'letters';
  const rows = letters ? letterRows.map((row) => Array.from(uppercase ? row.toUpperCase() : row))
    : (layout === 'numbers' ? numberRows : symbolRows).map((row) => Array.from(row));
  const characterKey = (character: string) => (
    <Button key={character} color="secondary" variant="soft" className={`${s.Key} ${s.TextKey}`} aria-label={character} data-character={character}
      onPointerDown={(event) => event.preventDefault()} onClick={() => { if (isPreviewKeyboardCommand(character)) onKey(character); }}>
      <span className={s.Character}>{character}</span>
    </Button>
  );
  return (
    <div className={`${s.Keyboard} ${s.TextKeyboard}`} role="group" aria-label="Preview text keyboard" data-layout={layout} data-uppercase={uppercase || undefined}>
      <div className={s.KeyRows}>
        <div className={s.TextRow}>{rows[0].map(characterKey)}</div>
        <div className={`${s.TextRow} ${letters ? s.LetterMiddleRow : s.SymbolMiddleRow}`}>{rows[1].map(characterKey)}</div>
        <div className={`${s.TextRow} ${s.ThirdRow}`}>
          {letters ? (
            <Button color="secondary" variant="soft" className={`${s.Key} ${s.TextKey} ${s.Modifier}`} aria-label="Shift" aria-pressed={uppercase}
              onPointerDown={(event) => event.preventDefault()} onClick={() => setUppercase((value) => !value)}>
              <span className={`${s.Glyph} ${s.ShiftGlyph}`} aria-hidden="true" />
            </Button>
          ) : (
            <Button color="secondary" variant="soft" className={`${s.Key} ${s.TextKey} ${s.Modifier} ${s.SymbolSwitch}`}
              aria-label={layout === 'numbers' ? 'Show symbols' : 'Show numbers'}
              onPointerDown={(event) => event.preventDefault()} onClick={() => setLayout(layout === 'numbers' ? 'symbols' : 'numbers')}>
              {layout === 'numbers' ? '#+=' : '123'}
            </Button>
          )}
          <div className={s.ThirdRowCharacters}>{rows[2].map(characterKey)}</div>
          <Button color="secondary" variant="soft" className={`${s.Key} ${s.TextKey} ${s.Modifier}`} aria-label="Backspace"
            onPointerDown={(event) => event.preventDefault()} onClick={() => onKey('Backspace')}>
            <span className={`${s.Glyph} ${s.DeleteGlyph}`} aria-hidden="true" />
          </Button>
        </div>
        <div className={s.TextRow}>
          <Button color="secondary" variant="soft" className={`${s.Key} ${s.TextKey} ${s.LayoutSwitch}`}
            aria-label={letters ? 'Show numbers' : 'Show letters'}
            onPointerDown={(event) => event.preventDefault()} onClick={() => setLayout(letters ? 'numbers' : 'letters')}>
            {letters ? '123' : 'ABC'}
          </Button>
          <Button color="secondary" variant="soft" className={`${s.Key} ${s.TextKey}`} aria-label="Space"
            onPointerDown={(event) => event.preventDefault()} onClick={() => onKey(' ')}><span aria-hidden="true">{'\u00a0'}</span></Button>
          <Button color="primary" variant="solid" className={`${s.Key} ${s.TextKey} ${s.Return}`} aria-label="Return"
            onPointerDown={(event) => event.preventDefault()} onClick={() => onKey('Enter')}>
            <span className={`${s.Glyph} ${s.ReturnGlyph}`} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Interactive docs simulator, not a replacement for the browser's native keyboard. */
export function PreviewKeyboard({ onKey, kind = 'numeric' }: { onKey: KeyHandler; kind?: PreviewKeyboardKind }) {
  if (kind === 'text') return <TextKeyboard onKey={onKey} />;
  return (
    <div className={s.Keyboard} role="group" aria-label="Preview numeric keyboard">
      {keys.map(([digit, letters]) => (
        <Button key={digit} color="secondary" variant="soft" className={s.Key} aria-label={digit}
          onPointerDown={(event) => event.preventDefault()} onClick={() => onKey(digit)}>
          <span className={s.Digit}>{digit}</span><span className={s.Letters} aria-hidden="true">{letters || '\u00a0'}</span>
        </Button>
      ))}
      <span aria-hidden="true" />
      <Button color="secondary" variant="soft" className={`${s.Key} ${s.Zero}`} aria-label="0"
        onPointerDown={(event) => event.preventDefault()} onClick={() => onKey('0')}><span className={s.Digit}>0</span></Button>
      <Button color="secondary" variant="ghost" className={`${s.Key} ${s.Delete}`} aria-label="Backspace"
        onPointerDown={(event) => event.preventDefault()} onClick={() => onKey('Backspace')}><Delete aria-hidden="true" /></Button>
    </div>
  );
}
