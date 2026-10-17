// Einfache Heuristik zur Spracherkennung Deutsch vs. Englisch.
// Wird genutzt, um vertauschte Vokabelpaare (Englisch im Feld "Deutsch" und
// umgekehrt) zu erkennen und zu korrigieren – z.B. wenn die KI beim
// Foto-Import die Felder verwechselt hat.

const GERMAN_WORDS = new Set([
  'der', 'die', 'das', 'den', 'dem', 'des', 'ein', 'eine', 'einen', 'einem', 'einer', 'und', 'oder', 'aber',
  'ist', 'sind', 'war', 'waren', 'bin', 'bist', 'seid', 'hat', 'habe', 'haben', 'hast', 'wird', 'werden',
  'nicht', 'kein', 'keine', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'mich', 'dich', 'sich', 'mein',
  'dein', 'sein', 'unser', 'euer', 'zu', 'mit', 'von', 'für', 'auf', 'aus', 'bei', 'nach', 'über', 'unter',
  'vor', 'auch', 'noch', 'schon', 'sehr', 'wie', 'was', 'wer', 'wo', 'warum', 'wann', 'dass', 'wenn', 'weil',
  'ja', 'nein', 'heute', 'morgen', 'gestern', 'gut', 'schön', 'groß', 'klein', 'machen', 'gehen', 'kommen',
  'jetzt', 'hier', 'dort', 'immer', 'nie', 'etwas', 'viel', 'viele', 'mehr', 'alle', 'im', 'am', 'zum', 'zur',
]);

const ENGLISH_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'am', 'be', 'been', 'have', 'has', 'had',
  'will', 'would', 'can', 'could', 'should', 'not', "don't", "doesn't", 'no', 'i', 'you', 'he', 'she', 'it',
  'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their', 'to', 'of', 'with',
  'from', 'for', 'on', 'at', 'by', 'in', 'about', 'into', 'this', 'that', 'these', 'those', 'what', 'who',
  'where', 'why', 'when', 'how', 'yes', 'today', 'tomorrow', 'yesterday', 'good', 'beautiful', 'big', 'small',
  'make', 'go', 'come', 'do', 'does', 'did', 'now', 'here', 'there', 'always', 'never', 'something', 'much',
  'many', 'more', 'all', 'very', 'also', 'still', 'already', 'because', 'if', 'than', 'then', 'there',
]);

/** Positiver Wert = eher Deutsch, negativer Wert = eher Englisch, 0 = unklar. */
export function germanScore(text: string): number {
  const t = (text ?? '').toLowerCase().trim();
  if (!t) return 0;
  let score = 0;
  if (/[äöüß]/.test(t)) score += 3;
  const words = t.split(/[^a-zäöüß']+/).filter(Boolean);
  for (const w of words) {
    if (GERMAN_WORDS.has(w)) score += 2;
    if (ENGLISH_WORDS.has(w)) score -= 2;
    if (/(ung|keit|heit|lich|chen|schaft)$/.test(w)) score += 1;
    if (/sch/.test(w)) score += 1;
    if (/(ing|ly|ness|ight)$/.test(w) && w.length > 4) score -= 1;
    if (/th|wh|ck$/.test(w)) score -= 1;
  }
  return score;
}

/**
 * Prüft ein Vokabelpaar und tauscht die Felder, falls sie eindeutig vertauscht
 * sind (Feld "german" sieht englisch aus UND Feld "english" sieht deutsch aus).
 * Bei Unklarheit bleibt das Paar unverändert.
 */
export function normalizePair<T extends { german: string; english: string }>(pair: T): T {
  const g = germanScore(pair.german);
  const e = germanScore(pair.english);
  if (g < 0 && e > 0) return { ...pair, german: pair.english, english: pair.german };
  // Schwächerer Fall: eine Seite eindeutig, die andere neutral, aber klar gegensätzlich.
  if (g - e <= -3 && (g < 0 || e > 0)) return { ...pair, german: pair.english, english: pair.german };
  return pair;
}
