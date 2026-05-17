const KEY_CODES = {
  Backspace: 0x08,
  Tab: 0x09,
  Enter: 0x0D,
  Shift: 0x10,
  Control: 0x11,
  Alt: 0x12,
  Pause: 0x13,
  CapsLock: 0x14,
  Escape: 0x1B,
  Space: 0x20,
  PageUp: 0x21,
  PageDown: 0x22,
  End: 0x23,
  Home: 0x24,
  ArrowLeft: 0x25,
  ArrowUp: 0x26,
  ArrowRight: 0x27,
  ArrowDown: 0x28,
  Insert: 0x2D,
  Delete: 0x2E,
  Meta: 0x5B,
  Numpad0: 0x60,
  Numpad1: 0x61,
  Numpad2: 0x62,
  Numpad3: 0x63,
  Numpad4: 0x64,
  Numpad5: 0x65,
  Numpad6: 0x66,
  Numpad7: 0x67,
  Numpad8: 0x68,
  Numpad9: 0x69,
  NumpadMultiply: 0x6A,
  NumpadAdd: 0x6B,
  NumpadSubtract: 0x6D,
  NumpadDecimal: 0x6E,
  NumpadDivide: 0x6F,
  F1: 0x70,
  F2: 0x71,
  F3: 0x72,
  F4: 0x73,
  F5: 0x74,
  F6: 0x75,
  F7: 0x76,
  F8: 0x77,
  F9: 0x78,
  F10: 0x79,
  F11: 0x7A,
  F12: 0x7B,
  Semicolon: 0xBA,
  Equal: 0xBB,
  Comma: 0xBC,
  Minus: 0xBD,
  Period: 0xBE,
  Slash: 0xBF,
  Backquote: 0xC0,
  BracketLeft: 0xDB,
  Backslash: 0xDC,
  BracketRight: 0xDD,
  Quote: 0xDE,
};

for (let index = 0; index <= 9; index += 1) {
  KEY_CODES[`Digit${index}`] = 0x30 + index;
}

'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach((letter) => {
  KEY_CODES[`Key${letter}`] = letter.charCodeAt(0);
});

const KEY_LABELS = {
  Backspace: 'Backspace',
  Tab: 'Tab',
  Enter: 'Enter',
  Shift: 'Shift',
  Control: 'Ctrl',
  Alt: 'Alt',
  Pause: 'Pause',
  CapsLock: 'Caps Lock',
  Escape: 'Esc',
  Space: 'Space',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  End: 'End',
  Home: 'Home',
  ArrowLeft: 'Left',
  ArrowUp: 'Up',
  ArrowRight: 'Right',
  ArrowDown: 'Down',
  Insert: 'Insert',
  Delete: 'Delete',
  Meta: 'Win',
  Semicolon: ';',
  Equal: '=',
  Comma: ',',
  Minus: '-',
  Period: '.',
  Slash: '/',
  Backquote: '`',
  BracketLeft: '[',
  Backslash: '\\',
  BracketRight: ']',
  Quote: "'",
};

function normalizeKeyName(key) {
  if (!key) return null;
  if (KEY_CODES[key]) return key;
  if (/^F([1-9]|1[0-2])$/.test(key)) return key;
  if (/^[a-z]$/i.test(key)) return `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return `Digit${key}`;
  return null;
}

function keyNameFromEvent(event) {
  const codeName = normalizeKeyName(event.code);
  if (codeName) return codeName;
  return normalizeKeyName(event.key);
}

function getKeyCode(keyName) {
  return KEY_CODES[normalizeKeyName(keyName)] || null;
}

function getKeyLabel(keyName) {
  const normalized = normalizeKeyName(keyName);
  if (!normalized) return '';
  if (KEY_LABELS[normalized]) return KEY_LABELS[normalized];
  if (/^Key[A-Z]$/.test(normalized)) return normalized.replace('Key', '');
  if (/^Digit[0-9]$/.test(normalized)) return normalized.replace('Digit', '');
  if (/^Numpad[0-9]$/.test(normalized)) return normalized.replace('Numpad', 'Numpad ');
  return normalized;
}

module.exports = {
  getKeyCode,
  getKeyLabel,
  keyNameFromEvent,
  KEY_CODES,
};
