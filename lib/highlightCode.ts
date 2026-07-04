// Lightweight, dependency-free syntax highlighter — react-syntax-highlighter
// renders actual DOM (<pre>/<code>) under the hood, which works via
// react-native-web but can't run in a plain native Text tree, so a small
// regex tokenizer here covers both platforms identically instead of forking
// per-platform code block implementations.

export type TokenType = 'keyword' | 'string' | 'comment' | 'number' | 'plain';

export interface Token {
  text: string;
  type: TokenType;
}

const KEYWORDS = [
  'function', 'return', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'do', 'switch',
  'case', 'break', 'continue', 'class', 'extends', 'new', 'this', 'import', 'export', 'from',
  'default', 'async', 'await', 'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'in',
  'of', 'null', 'undefined', 'true', 'false', 'void', 'yield', 'static', 'get', 'set', 'super',
  'interface', 'implements', 'type', 'enum', 'public', 'private', 'protected', 'readonly',
  'def', 'elif', 'except', 'with', 'as', 'pass', 'lambda', 'None', 'True', 'False', 'print',
  'self', 'raise', 'global', 'nonlocal', 'assert',
  'package', 'namespace', 'using', 'struct', 'fn', 'impl', 'match', 'mod', 'pub', 'mut', 'fun',
  'val', 'when', 'func', 'guard', 'var', 'let',
];

// Order matters: comments/strings must win over keyword matches that could
// appear inside them, so they're tried first via a single alternated regex
// rather than separate passes (which would double-tokenize overlaps).
const TOKEN_REGEX = new RegExp(
  [
    '(//.*)', // line comment (//, also covers most C-like langs)
    '(#.*)', // line comment (#, Python/shell/Ruby)
    '(/\\*[\\s\\S]*?\\*/)', // block comment
    '("(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\'|`(?:[^`\\\\]|\\\\.)*`)', // strings
    '(\\b\\d+\\.?\\d*\\b)', // numbers
    `(\\b(?:${KEYWORDS.join('|')})\\b)`, // keywords
  ].join('|'),
  'gm'
);

export function tokenizeCode(code: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  TOKEN_REGEX.lastIndex = 0;

  while ((match = TOKEN_REGEX.exec(code))) {
    if (match.index > lastIndex) {
      tokens.push({ text: code.slice(lastIndex, match.index), type: 'plain' });
    }
    const [, comment1, comment2, comment3, string, number, keyword] = match;
    const type: TokenType = comment1 || comment2 || comment3
      ? 'comment'
      : string
        ? 'string'
        : number
          ? 'number'
          : keyword
            ? 'keyword'
            : 'plain';
    tokens.push({ text: match[0], type });
    lastIndex = TOKEN_REGEX.lastIndex;
  }
  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex), type: 'plain' });
  }
  return tokens;
}
