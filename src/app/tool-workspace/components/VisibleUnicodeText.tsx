'use client';

import React from 'react';

const INVISIBLE_CHARACTER = /[\u0000-\u001f\u007f-\u009f\u00ad\u034f\u061c\u115f-\u1160\u17b4-\u17b5\u180b-\u180f\u200b-\u200f\u2028-\u202e\u2060-\u206f\u3164\ufeff\uffa0]/;

const INVISIBLE_CHARACTER_NAMES: Record<number, string> = {
  0x00ad: 'SOFT HYPHEN',
  0x034f: 'COMBINING GRAPHEME JOINER',
  0x061c: 'ARABIC LETTER MARK',
  0x200b: 'ZERO WIDTH SPACE',
  0x200c: 'ZERO WIDTH NON-JOINER',
  0x200d: 'ZERO WIDTH JOINER',
  0x202a: 'LEFT-TO-RIGHT EMBEDDING',
  0x202b: 'RIGHT-TO-LEFT EMBEDDING',
  0x202c: 'POP DIRECTIONAL FORMATTING',
  0x202d: 'LEFT-TO-RIGHT OVERRIDE',
  0x202e: 'RIGHT-TO-LEFT OVERRIDE',
  0x2060: 'WORD JOINER',
  0xfeff: 'ZERO WIDTH NO-BREAK SPACE / BOM',
};

function getInvisibleCharacterName(codePoint: number): string {
  return INVISIBLE_CHARACTER_NAMES[codePoint] || 'INVISIBLE OR CONTROL CHARACTER';
}

export function hasInvisibleUnicode(value: string): boolean {
  return INVISIBLE_CHARACTER.test(value);
}

export default function VisibleUnicodeText({ value }: { value: string }) {
  return (
    <>
      {Array.from(value, (character, index) => {
        if (!INVISIBLE_CHARACTER.test(character)) return <React.Fragment key={index}>{character}</React.Fragment>;

        const codePoint = character.codePointAt(0) ?? 0;
        const hexadecimal = codePoint.toString(16).toUpperCase().padStart(4, '0');
        const name = getInvisibleCharacterName(codePoint);
        const description = `${name} (U+${hexadecimal})`;

        return (
          <span
            key={index}
            className="inline-flex items-center gap-1 mx-0.5 align-middle text-red-400"
            title={description}
            aria-label={description}
          >
            <span aria-hidden="true">●</span>
            <span className="text-[10px] leading-none">{`U+${hexadecimal}`}</span>
          </span>
        );
      })}
    </>
  );
}
