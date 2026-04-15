// ── Central i18n registry ─────────────────────────────────────
// To add a new language:
//   1. Add the locale key to the `Locale` type below.
//   2. Add a matching entry to the `i18n` object with all required strings.
//   3. Add the locale to the DE | EN toggle in ChatWindow.tsx (the only
//      place in the UI that needs to know which locales are supported).
// No other files need to change.

export type Locale = "de" | "en";

export const i18n: Record<Locale, {
  // Welcome card
  greeting: string;
  tryOne: string;
  suggestions: string[];

  // Refinement panel
  refinementQ: string;
  tryForm: string;
  refinementPlaceholder: string;

  // Input bar
  inputPlaceholder: string;
  poweredBy: string;

  // Consent / declined state
  declined: string;
  changeMind: string;

  // Form pills (key must match FORM_PILLS keys in ChatWindow)
  formLabels: Record<string, string>;
  formMsg: (label: string) => string;

  // Kebab menu
  menu: {
    transcript: string;
    privacy: string;
    endChat: string;
  };

  // MessageBubble
  delivered: string;
  learnMore: string;
  hide: string;
  metrics: string;

  // ProductCarousel
  intro: string;
  seeMore: string;
  whyFits: string;
  ingredients: string;
  note: string;

  // Pipeline tracker step names
  agentNames: {
    intent_classifier: string;
    health_profiler: string;
    product_retriever: string;
    embedding_matcher: string;
    contraindication_checker: string;
    dosage_advisor: string;
    response_composer: string;
    followup_generator: string;
  };
}> = {
  de: {
    greeting: "Hallo 👋 Ich bin Ihr Sunday Natural Berater. Ich helfe Ihnen, das beste Magnesium für Sie zu finden! 🌿",
    tryOne: "Probieren Sie eine dieser Optionen:",
    suggestions: [
      "Magnesium gegen Stress und Angst",
      "Ich brauche Magnesium für besseren Schlaf",
      "Welches Magnesium hilft am besten bei Muskelentspannung?",
      "Bestes allgemeines Magnesium-Supplement",
    ],

    refinementQ: "Passen diese gut – oder haben Sie besondere Wünsche?",
    tryForm: "ANDERE FORM AUSPROBIEREN",
    refinementPlaceholder: "z.B. hohe Dosis, vegan, nur Pulver...",

    inputPlaceholder: "Fragen Sie mich nach Magnesium...",
    poweredBy: "⚡ Powered by Sunday Natural",

    declined: "Sie haben die Datenverarbeitung abgelehnt. Der Berater ist nicht verfügbar.",
    changeMind: "Meinung ändern",

    formLabels: {
      capsule: "Kapsel",
      tablet: "Tablette",
      powder: "Pulver",
      liquid: "Flüssig",
      gummy: "Gummibärchen",
    },
    formMsg: (label) => `Ich bevorzuge Magnesium in ${label}form`,

    menu: {
      transcript: "Transkript herunterladen",
      privacy: "Datenschutz",
      endChat: "Chat beenden",
    },

    delivered: "Zugestellt",
    learnMore: "Mehr über diese Form erfahren",
    hide: "Ausblenden",
    metrics: "Performance-Metriken",

    intro: "Hier sind einige Produkte, die gut zu Ihnen passen könnten:",
    seeMore: "Mehr erfahren",
    whyFits: "Warum es passt:",
    ingredients: "Inhaltsstoffe:",
    note: "Hinweis:",

    agentNames: {
      intent_classifier: "Absicht",
      health_profiler: "Profil",
      product_retriever: "Produkte",
      embedding_matcher: "Abgleich",
      contraindication_checker: "Sicherheit",
      dosage_advisor: "Dosierung",
      response_composer: "Antwort",
      followup_generator: "Vorschläge",
    },
  },

  en: {
    greeting: "Hello 👋 I am your Sunday Natural Advisor. I can help you discover the best magnesium for you! 🌿",
    tryOne: "Try one of these:",
    suggestions: [
      "Magnesium for stress and anxiety",
      "I need magnesium for better sleep",
      "What magnesium is best for muscle relaxation?",
      "Best general magnesium supplement",
    ],

    refinementQ: "Are these a good fit — or do you have special preferences?",
    tryForm: "TRY A DIFFERENT FORM",
    refinementPlaceholder: "e.g. high dose, vegan, powder only...",

    inputPlaceholder: "Ask me about magnesium...",
    poweredBy: "⚡ Powered by Sunday Natural",

    declined: "You have declined data processing. The advisor is unavailable.",
    changeMind: "Change my mind",

    formLabels: {
      capsule: "Capsule",
      tablet: "Tablet",
      powder: "Powder",
      liquid: "Liquid",
      gummy: "Gummy",
    },
    formMsg: (label) => `I prefer ${label} form magnesium`,

    menu: {
      transcript: "Download transcript",
      privacy: "Privacy policy",
      endChat: "End chat",
    },

    delivered: "Delivered",
    learnMore: "Learn more about this form",
    hide: "Hide",
    metrics: "Performance Metrics",

    intro: "Here are some products that could be a great fit for you:",
    seeMore: "See More",
    whyFits: "Why this fits:",
    ingredients: "Ingredients:",
    note: "Note:",

    agentNames: {
      intent_classifier: "Intent",
      health_profiler: "Profile",
      product_retriever: "Products",
      embedding_matcher: "Match",
      contraindication_checker: "Safety",
      dosage_advisor: "Dosage",
      response_composer: "Compose",
      followup_generator: "Suggest",
    },
  },
};
