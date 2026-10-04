// Layout Engine: Word tokenization, font metrics, line wrapping, token persistence, and cursor tracking
import { WordToken, CharMetric, DocumentLayout } from './types';
import { BOTANICAL_CONFIG } from './config';
import {
  createBotanicalInstance,
  updateBotanicalInstanceForWord,
  BotanicalLifecycleManager,
} from './botanicalEngine';

export interface MeasureContext {
  measureText: (text: string) => { width: number };
  font?: string;
  letterSpacing?: string;
}

// Fallback serif proportional character widths relative to fontSize
const CHAR_WIDTH_RATIOS: Record<string, number> = {
  i: 0.28,
  l: 0.28,
  j: 0.28,
  f: 0.32,
  t: 0.35,
  r: 0.38,
  s: 0.42,
  c: 0.44,
  e: 0.45,
  o: 0.52,
  a: 0.48,
  b: 0.52,
  d: 0.54,
  h: 0.52,
  k: 0.50,
  n: 0.52,
  p: 0.52,
  q: 0.52,
  u: 0.52,
  v: 0.48,
  g: 0.50,
  x: 0.48,
  y: 0.48,
  z: 0.45,
  w: 0.72,
  m: 0.78,
  // Digits
  '0': 0.52,
  '1': 0.32,
  '2': 0.48,
  '3': 0.48,
  '4': 0.52,
  '5': 0.48,
  '6': 0.52,
  '7': 0.46,
  '8': 0.52,
  '9': 0.52,
  // Whitespace & Punctuation
  ' ': 0.28,
  '.': 0.22,
  ',': 0.22,
  ';': 0.25,
  ':': 0.25,
  '!': 0.28,
  '?': 0.45,
  '-': 0.32,
  '—': 0.75,
  '–': 0.50,
  "'": 0.20,
  '"': 0.38,
  '‘': 0.20,
  '’': 0.20,
  '“': 0.38,
  '”': 0.38,
  '(': 0.32,
  ')': 0.32,
  '[': 0.32,
  ']': 0.32,
  '/': 0.38,
  '\\': 0.38,
  '|': 0.20,
  '_': 0.45,
};

const UPPER_RATIOS: Record<string, number> = {
  I: 0.32, J: 0.40, L: 0.52, F: 0.52, T: 0.60, E: 0.55, P: 0.55,
  B: 0.60, R: 0.62, S: 0.52, C: 0.62, K: 0.60, V: 0.62, A: 0.65,
  U: 0.65, D: 0.68, G: 0.68, O: 0.68, Q: 0.68, N: 0.68, H: 0.68,
  X: 0.62, Y: 0.60, Z: 0.58, M: 0.85, W: 0.88,
};

export function getFontString(fontSize: number = BOTANICAL_CONFIG.baseFontSize): string {
  return `${fontSize}px ${BOTANICAL_CONFIG.fontFamily}`;
}

export function getLetterSpacingPx(fontSize: number = BOTANICAL_CONFIG.baseFontSize): number {
  const str = BOTANICAL_CONFIG.letterSpacing || '0';
  const val = parseFloat(str);
  if (!Number.isFinite(val) || val === 0) return 0;
  if (str.endsWith('em')) {
    return val * fontSize;
  }
  if (str.endsWith('px')) {
    return val;
  }
  return val * fontSize;
}

export function measureChar(char: string, fontSize: number, ctx?: MeasureContext): number {
  if (!char) return 0;

  const isUpper = char >= 'A' && char <= 'Z';
  const lower = char.toLowerCase();
  let ratio: number;
  if (isUpper) {
    ratio = UPPER_RATIOS[char] ?? 0.65;
  } else {
    ratio = CHAR_WIDTH_RATIOS[char] ?? CHAR_WIDTH_RATIOS[lower] ?? 0.48;
  }
  const fallbackWidth = ratio * fontSize;

  if (ctx) {
    const fontStr = getFontString(fontSize);
    if ('font' in ctx && (ctx as any).font !== fontStr) {
      (ctx as any).font = fontStr;
    }
    if ('letterSpacing' in ctx && (ctx as any).letterSpacing !== '0px') {
      try {
        (ctx as any).letterSpacing = '0px';
      } catch {
        // Ignore read-only or unsupported letterSpacing
      }
    }

    const measured = ctx.measureText(char).width;
    // Guard against 0, NaN, negative, or default 10px font collapse
    // Punctuation like "'" at 68px is ~12.2px, but in 10px default font it is ~2px.
    // Minimum plausible for visible characters at target fontSize is 0.10 * fontSize (6.8px at 68px).
    const minThreshold = char.trim() === '' ? fontSize * 0.15 : fontSize * 0.10;
    if (Number.isFinite(measured) && measured >= minThreshold) {
      return measured;
    }
    return fallbackWidth;
  }

  return fallbackWidth;
}

export function computeEditDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const row = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= lb; j++) {
      const temp = row[j];
      if (a[i - 1] === b[j - 1]) {
        row[j] = prev;
      } else {
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + 1);
      }
      prev = temp;
    }
  }
  return row[lb];
}

interface RawWord {
  text: string;
  startIndex: number;
  endIndex: number;
  hardLineIndex: number;
}

export class DocumentModel {
  private words: WordToken[] = [];
  public lifecycleManager: BotanicalLifecycleManager;
  public fullText: string = '';
  public cursorIndex: number = 0;
  private currentLayout: DocumentLayout | null = null;
  private cachedMeasureCtx?: MeasureContext;

  constructor() {
    this.lifecycleManager = new BotanicalLifecycleManager();
  }

  setText(text: string, cursorIndex: number, measureCtx?: MeasureContext): DocumentLayout {
    this.fullText = text;
    this.cursorIndex = Math.max(0, Math.min(cursorIndex, text.length));
    if (measureCtx) {
      this.cachedMeasureCtx = measureCtx;
    }
    this.currentLayout = this.relayout(measureCtx ?? this.cachedMeasureCtx);
    return this.currentLayout;
  }

  public relayout(measureCtx?: MeasureContext): DocumentLayout {
    const fontSize = BOTANICAL_CONFIG.baseFontSize;
    const lineHeight = fontSize * BOTANICAL_CONFIG.lineHeightMultiplier;
    const maxLineWidth = BOTANICAL_CONFIG.lineWidth;
    const letterSpacingPx = getLetterSpacingPx(fontSize);

    const effectiveCtx = measureCtx ?? this.cachedMeasureCtx;
    if (measureCtx && !this.cachedMeasureCtx) {
      this.cachedMeasureCtx = measureCtx;
    }

    if (effectiveCtx) {
      const fontStr = getFontString(fontSize);
      if ('font' in effectiveCtx && (effectiveCtx as any).font !== fontStr) {
        (effectiveCtx as any).font = fontStr;
      }
      if ('letterSpacing' in effectiveCtx && (effectiveCtx as any).letterSpacing !== '0px') {
        try {
          (effectiveCtx as any).letterSpacing = '0px';
        } catch {
          // ignore
        }
      }
    }

    const spaceWidth = Math.max(fontSize * 0.28, measureChar(' ', fontSize, effectiveCtx));

    // 1. Split fullText into paragraphs / hard lines by newline
    const hardLinesText: { text: string; startOffset: number }[] = [];
    let lineStart = 0;
    for (let i = 0; i <= this.fullText.length; i++) {
      if (i === this.fullText.length || this.fullText[i] === '\n') {
        hardLinesText.push({
          text: this.fullText.substring(lineStart, i).replace(/\r$/, ''),
          startOffset: lineStart,
        });
        lineStart = i + 1;
      }
    }

    // 2. Tokenize words within each hard line
    const rawWords: RawWord[] = [];
    for (let h = 0; h < hardLinesText.length; h++) {
      const hl = hardLinesText[h];
      let currentWordStart = -1;
      for (let c = 0; c <= hl.text.length; c++) {
        const char = hl.text[c];
        const isWhitespace = !char || /\s/.test(char);

        if (!isWhitespace) {
          if (currentWordStart === -1) {
            currentWordStart = c;
          }
        } else {
          if (currentWordStart !== -1) {
            rawWords.push({
              text: hl.text.substring(currentWordStart, c),
              startIndex: hl.startOffset + currentWordStart,
              endIndex: hl.startOffset + c,
              hardLineIndex: h,
            });
            currentWordStart = -1;
          }
        }
      }
    }

    // 3. Optimal alignment between old tokens and new raw words (DP with LCS & Edit Distance)
    const m = this.words.length;
    const n = rawWords.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    const calcMatchScore = (oldToken: WordToken, raw: RawWord, oldIdx: number, rawIdx: number): number => {
      if (oldToken.text === raw.text) return 100;

      const s1 = oldToken.text;
      const s2 = raw.text;
      const minLen = Math.min(s1.length, s2.length);
      const maxLen = Math.max(s1.length, s2.length);

      let prefix = 0;
      while (prefix < minLen && s1[prefix] === s2[prefix]) {
        prefix++;
      }

      let suffix = 0;
      while (suffix < minLen - prefix && s1[s1.length - 1 - suffix] === s2[s2.length - 1 - suffix]) {
        suffix++;
      }

      const dist = computeEditDistance(s1, s2);
      const similarity = 1 - dist / maxLen;
      const posDelta = Math.abs(oldIdx - rawIdx);
      const posBonus = posDelta === 0 ? 15 : (posDelta === 1 ? 5 : 0);

      // Suffix/prefix or small edit distance preservation
      if (prefix >= 3) {
        return 50 + prefix * 5 + posBonus;
      }
      if (prefix >= 1 && (minLen <= 3 || dist <= 1)) {
        return 50 + 20 + posBonus - dist * 5;
      }
      if (dist <= 2 || similarity >= 0.45) {
        return Math.round(40 + similarity * 40 + posBonus);
      }
      if (posDelta === 0 && maxLen <= 3 && dist <= 2) {
        return 45;
      }

      return 0;
    };

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const score = calcMatchScore(this.words[i - 1], rawWords[j - 1], i - 1, j - 1);
        if (score > 0) {
          dp[i][j] = dp[i - 1][j - 1] + score;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack aligned pairs
    const alignedPairs = new Map<number, number>(); // rawWordIndex -> oldTokenIndex
    let bi = m;
    let bj = n;
    while (bi > 0 && bj > 0) {
      const score = calcMatchScore(this.words[bi - 1], rawWords[bj - 1], bi - 1, bj - 1);
      if (score > 0 && dp[bi][bj] === dp[bi - 1][bj - 1] + score) {
        alignedPairs.set(bj - 1, bi - 1);
        bi--;
        bj--;
      } else if (dp[bi - 1][bj] >= dp[bi][bj - 1]) {
        bi--;
      } else {
        bj--;
      }
    }

    const newWordTokens: WordToken[] = [];
    const usedOldTokens = new Set<string>();

    for (let j = 0; j < rawWords.length; j++) {
      const rw = rawWords[j];
      const oldIdx = alignedPairs.get(j);
      let matchedToken: WordToken | undefined = undefined;

      if (oldIdx !== undefined) {
        matchedToken = this.words[oldIdx];
        usedOldTokens.add(matchedToken.id);
        matchedToken.text = rw.text;
        matchedToken.startIndex = rw.startIndex;
        matchedToken.endIndex = rw.endIndex;
      } else {
        const botanical = createBotanicalInstance(rw.text);
        matchedToken = {
          id: `word-${Date.now()}-${j}-${Math.random().toString(36).substring(2, 6)}`,
          text: rw.text,
          startIndex: rw.startIndex,
          endIndex: rw.endIndex,
          lineIndex: 0,
          x: 0,
          y: 0,
          width: 0,
          height: fontSize,
          charMetrics: [],
          botanicalInstance: botanical,
        };
      }

      // Compute character metrics
      const metrics: CharMetric[] = [];
      let wordWidth = 0;
      for (let c = 0; c < rw.text.length; c++) {
        const char = rw.text[c];
        const w = measureChar(char, fontSize, effectiveCtx);
        metrics.push({
          char,
          x: wordWidth,
          y: 0,
          width: w,
        });
        wordWidth += w;
      }
      matchedToken.charMetrics = metrics;
      matchedToken.width = wordWidth;
      matchedToken.height = fontSize;

      const isWordActive =
        this.cursorIndex >= rw.startIndex && this.cursorIndex <= rw.endIndex;

      updateBotanicalInstanceForWord(
        matchedToken.botanicalInstance,
        rw.text,
        metrics,
        fontSize,
        isWordActive,
        this.lifecycleManager,
        matchedToken.x,
        matchedToken.y
      );

      newWordTokens.push(matchedToken);
    }

    // Trigger localized whole-word retraction for unmatched old tokens
    for (const oldToken of this.words) {
      if (!usedOldTokens.has(oldToken.id)) {
        this.lifecycleManager.startRetraction(oldToken, 350);
      }
    }

    this.words = newWordTokens;

    // 4. Line wrapping pass supporting explicit newlines
    const lines: {
      lineIndex: number;
      words: WordToken[];
      y: number;
      height: number;
      width: number;
      startCharIndex: number;
      endCharIndex: number;
    }[] = [];

    let currentLineIndex = 0;

    for (let h = 0; h < hardLinesText.length; h++) {
      const hl = hardLinesText[h];
      const hardLineWords = this.words.filter((w, idx) => rawWords[idx]?.hardLineIndex === h);

      if (hardLineWords.length === 0) {
        // Empty line (e.g. blank line \n\n)
        const baselineY = (currentLineIndex + 1) * lineHeight;
        lines.push({
          lineIndex: currentLineIndex,
          words: [],
          y: baselineY,
          height: lineHeight,
          width: 0,
          startCharIndex: hl.startOffset,
          endCharIndex: hl.startOffset + hl.text.length,
        });
        currentLineIndex++;
        continue;
      }

      // Soft word wrapping within this hard line
      let currentLineWords: WordToken[] = [];
      let currentLineWidth = 0;
      let lineStartChar = hardLineWords[0].startIndex;

      const commitLine = () => {
        if (currentLineWords.length === 0) return;
        const baselineY = (currentLineIndex + 1) * lineHeight;
        let curX = 0;
        for (let i = 0; i < currentLineWords.length; i++) {
          const wt = currentLineWords[i];
          wt.lineIndex = currentLineIndex;
          wt.x = curX;
          wt.y = baselineY;

          if (i < currentLineWords.length - 1) {
            const nextWt = currentLineWords[i + 1];
            const spacesCount = Math.max(1, nextWt.startIndex - wt.endIndex);
            curX += wt.width + spacesCount * spaceWidth;
          } else {
            curX += wt.width;
          }
        }
        const lastWord = currentLineWords[currentLineWords.length - 1];
        lines.push({
          lineIndex: currentLineIndex,
          words: [...currentLineWords],
          y: baselineY,
          height: lineHeight,
          width: curX,
          startCharIndex: lineStartChar,
          endCharIndex: lastWord.endIndex,
        });
        currentLineIndex++;
        currentLineWords = [];
        currentLineWidth = 0;
      };

      for (let w = 0; w < hardLineWords.length; w++) {
        const wt = hardLineWords[w];
        const prevWt = currentLineWords.length > 0 ? currentLineWords[currentLineWords.length - 1] : undefined;
        const spacesCount = prevWt ? Math.max(1, wt.startIndex - prevWt.endIndex) : 0;
        const neededWidth = currentLineWidth === 0 ? wt.width : currentLineWidth + spacesCount * spaceWidth + wt.width;

        if (currentLineWords.length > 0 && neededWidth > maxLineWidth) {
          commitLine();
          lineStartChar = wt.startIndex;
        }

        const effectiveSpaces = currentLineWords.length === 0 ? 0 : Math.max(1, wt.startIndex - currentLineWords[currentLineWords.length - 1].endIndex);
        currentLineWords.push(wt);
        currentLineWidth = currentLineWidth === 0 ? wt.width : currentLineWidth + effectiveSpaces * spaceWidth + wt.width;
      }

      commitLine();
    }

    if (lines.length === 0) {
      lines.push({
        lineIndex: 0,
        words: [],
        y: lineHeight,
        height: lineHeight,
        width: 0,
        startCharIndex: 0,
        endCharIndex: 0,
      });
    }

    // 5. Accurate Cursor Position Mapping
    let cursorPos = { lineIndex: 0, charIndexInDoc: this.cursorIndex, x: 0, y: lineHeight };
    let foundCursor = false;

    // Check inside word tokens
    for (const line of lines) {
      for (const wt of line.words) {
        if (this.cursorIndex >= wt.startIndex && this.cursorIndex <= wt.endIndex) {
          const offsetInWord = this.cursorIndex - wt.startIndex;
          let cx = wt.x;
          if (offsetInWord > 0 && wt.charMetrics.length > 0) {
            const m = wt.charMetrics[Math.min(offsetInWord - 1, wt.charMetrics.length - 1)];
            cx = wt.x + m.x + m.width;
          }
          cursorPos = {
            lineIndex: line.lineIndex,
            charIndexInDoc: this.cursorIndex,
            x: cx,
            y: line.y,
          };
          foundCursor = true;
          break;
        }
      }
      if (foundCursor) break;
    }

    // If cursor is in whitespace or newline between lines
    if (!foundCursor) {
      for (let li = 0; li < lines.length; li++) {
        const line = lines[li];
        const isLastLine = li === lines.length - 1;
        const nextLineStart = isLastLine ? this.fullText.length + 1 : lines[li + 1].startCharIndex;

        if (this.cursorIndex >= line.startCharIndex && this.cursorIndex < nextLineStart) {
          if (line.words.length === 0) {
            cursorPos = {
              lineIndex: line.lineIndex,
              charIndexInDoc: this.cursorIndex,
              x: 0,
              y: line.y,
            };
          } else {
            let foundBetween = false;
            for (let w = 0; w < line.words.length - 1; w++) {
              const currW = line.words[w];
              const nextW = line.words[w + 1];
              if (this.cursorIndex >= currW.endIndex && this.cursorIndex <= nextW.startIndex) {
                const spaceOffset = this.cursorIndex - currW.endIndex;
                cursorPos = {
                  lineIndex: line.lineIndex,
                  charIndexInDoc: this.cursorIndex,
                  x: currW.x + currW.width + spaceOffset * spaceWidth,
                  y: line.y,
                };
                foundBetween = true;
                break;
              }
            }
            if (!foundBetween) {
              const lastWord = line.words[line.words.length - 1];
              const extraSpaces = Math.max(0, this.cursorIndex - lastWord.endIndex);
              cursorPos = {
                lineIndex: line.lineIndex,
                charIndexInDoc: this.cursorIndex,
                x: lastWord.x + lastWord.width + extraSpaces * spaceWidth,
                y: line.y,
              };
            }
          }
          foundCursor = true;
          break;
        }
      }
    }

    if (!foundCursor && lines.length > 0) {
      const lastLine = lines[lines.length - 1];
      cursorPos = {
        lineIndex: lastLine.lineIndex,
        charIndexInDoc: this.cursorIndex,
        x: lastLine.width,
        y: lastLine.y,
      };
    }

    const totalHeight = lines.length * lineHeight;

    return {
      lines,
      words: this.words,
      totalHeight,
      cursorPos,
    };
  }

  getCharIndexAtPosition(docX: number, docY: number): number {
    if (!this.currentLayout || this.currentLayout.lines.length === 0) {
      return 0;
    }
    const lines = this.currentLayout.lines;
    const lineHeight = BOTANICAL_CONFIG.baseFontSize * BOTANICAL_CONFIG.lineHeightMultiplier;

    // Find closest line by Y
    let bestLine = lines[0];
    let minDy = Math.abs(docY - bestLine.y);
    for (let i = 1; i < lines.length; i++) {
      const dy = Math.abs(docY - lines[i].y);
      if (dy < minDy) {
        minDy = dy;
        bestLine = lines[i];
      }
    }

    if (bestLine.words.length === 0) {
      return bestLine.startCharIndex;
    }

    // Find closest word and character on this line
    if (docX <= bestLine.words[0].x) {
      return bestLine.words[0].startIndex;
    }

    const lastWord = bestLine.words[bestLine.words.length - 1];
    if (docX >= lastWord.x + lastWord.width) {
      return lastWord.endIndex;
    }

    for (const word of bestLine.words) {
      if (docX >= word.x && docX <= word.x + word.width) {
        for (let c = 0; c < word.charMetrics.length; c++) {
          const charRelX = word.charMetrics[c].x;
          const charW = word.charMetrics[c].width;
          if (docX < word.x + charRelX + charW * 0.5) {
            return word.startIndex + c;
          }
        }
        return word.endIndex;
      }
    }

    return bestLine.words[0].startIndex;
  }

  getWords(): WordToken[] {
    return this.words;
  }
}
