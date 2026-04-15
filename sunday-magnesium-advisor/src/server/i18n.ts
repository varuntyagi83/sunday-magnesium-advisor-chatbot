// ── Central server-side i18n registry ────────────────────────
// To add a new language:
//   1. Add the locale key to `SupportedLocale`.
//   2. Add a matching entry to `agentLangInstruction` and `followupFallback`.
//   3. Add a matching entry to `composerFallback`.
// No other server files need to change.

export type SupportedLocale = "de" | "en";

/** Appended to Gemini agent system prompts to enforce output language. */
export const agentLangInstruction: Record<string, string> = {
  de: "WICHTIG: Schreibe die gesamte Antwort auf Deutsch.",
  en: "IMPORTANT: Write the entire response in English.",
};

/** Fallback follow-up suggestions used when Gemini call fails. */
export const followupFallback: Record<string, string[]> = {
  de: [
    "Was ist der Unterschied zwischen Glycinat und Citrat",
    "Wann merke ich erste Ergebnisse",
    "Kann ich Magnesium mit anderen Supplements nehmen",
  ],
  en: [
    "What is the difference between glycinate and citrate",
    "How long until I notice results",
    "Can I take magnesium with my other supplements",
  ],
};

/** Fallback response strings used when the response-composer Gemini call fails. */
export const composerFallback: Record<string, {
  withProduct: (name: string, url: string, form: string, mg: number, disclaimer: string) => string;
  withoutProduct: (disclaimer: string) => string;
}> = {
  de: {
    withProduct: (name, url, form, mg, disclaimer) =>
      `Basierend auf Ihren Angaben empfehle ich [${name}](${url}). Es ist eine ${form}-Form von Magnesium, die gut zu Ihren Bedurfnissen passt, mit ${mg}mg pro Portion. ${disclaimer}`,
    withoutProduct: (disclaimer) =>
      `Magnesiumglycinat ist generell der beste Einstieg fur die meisten Menschen. Es ist gut bioverfugbar und sanft fur das Verdauungssystem. ${disclaimer}`,
  },
  en: {
    withProduct: (name, url, form, mg, disclaimer) =>
      `Based on what you've shared, I'd recommend [${name}](${url}). It's a ${form} form of magnesium that's well-suited to your needs, at ${mg}mg per serving. ${disclaimer}`,
    withoutProduct: (disclaimer) =>
      `Magnesium glycinate is generally the best starting point for most people. It is highly bioavailable and gentle on the digestive system. ${disclaimer}`,
  },
};

/** Returns the lang instruction for a locale, falling back to German. */
export function getLangInstruction(locale: string): string {
  return agentLangInstruction[locale] ?? agentLangInstruction.de;
}

/** Returns fallback follow-ups for a locale, falling back to German. */
export function getFollowupFallback(locale: string): string[] {
  return followupFallback[locale] ?? followupFallback.de;
}

/** Returns composer fallback fns for a locale, falling back to German. */
export function getComposerFallback(locale: string) {
  return composerFallback[locale] ?? composerFallback.de;
}
