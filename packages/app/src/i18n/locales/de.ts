/**
 * German UI texts. This file defines the message schema; every other language must have the same
 * keys (checked by TypeScript in `en.ts`).
 *
 * @remarks
 * Only texts of the app itself live here. Product data (headline, description, accessory group
 * headlines, …) comes from the catalog API in the language of the URL; the mock catalog is
 * English only.
 * `{name}` is a placeholder filled in when the text is used, e.g. `t('mainProduct.notFound', { productId })`.
 */
const de = {
  mainProduct: {
    keyFeatures: 'Hauptmerkmale',
    viewOnWebsite: 'Auf der Website ansehen',
    copyId: 'Produkt-ID kopieren',
    copied: 'Kopiert',
    copiedAnnouncement: 'Produkt-ID {productId} wurde kopiert.',
    copyFailed: 'Kopieren fehlgeschlagen',
    enlargeImage: 'Bild vergrößern: {name}',
    closeImage: 'Schließen',
    noImage: 'Kein Bild verfügbar',
    imageFailed: 'Das Bild konnte nicht geladen werden.',
    loading: 'Produkt wird geladen …',
    slow: 'Die Produktdaten laden länger als gewohnt …',
    invalidId: '„{productId}“ ist keine gültige Produkt-ID (z. B. PRD-1001).',
    notFound: 'Produkt „{productId}“ wurde nicht gefunden.',
    loadFailed: 'Die Produktdaten konnten nicht geladen werden. Bitte prüfen Sie Ihre Verbindung.',
    timeout: 'Die Produktdaten brauchen zu lange. Bitte versuchen Sie es erneut.',
  },
  accessories: {
    title: 'Zubehör',
    loading: 'Zubehör wird geladen …',
    loadFailed: 'Das Zubehör konnte nicht geladen werden.',
    emptyTitle: 'Kein Zubehör',
    empty: 'Für dieses Produkt ist kein Zubehör verfügbar.',
    progress: '{loaded} von {total} geladen',
    progressWithFailed: '{loaded} von {total} geladen · {failed} fehlgeschlagen',
    loadMore: 'Mehr Zubehör laden',
  },
  categoryProducts: {
    title: 'Produkte derselben Kategorie',
    tab: 'Gleiche Kategorie',
    loading: 'Produkte derselben Kategorie werden geladen …',
    loadFailed: 'Produkte derselben Kategorie konnten nicht geladen werden.',
    emptyTitle: 'Keine weiteren Produkte',
    empty: 'Keine weiteren Produkte in dieser Kategorie.',
    progress: '{loaded} von {total} geladen',
    progressWithFailed: '{loaded} von {total} geladen · {failed} fehlgeschlagen',
    loadMore: 'Mehr Produkte laden',
  },
  variants: {
    cableLength: 'Kabellänge',
    title: 'Varianten',
    lengthsAvailable: '{count} Längen verfügbar',
    variantsAvailable: '{count} Varianten verfügbar',
    showMore: '{count} weitere Varianten anzeigen',
    showLess: 'Weniger Varianten anzeigen',
    selected: 'Ausgewählt:',
  },
  breadcrumbs: {
    label: 'Brotkrümelnavigation',
    home: 'Startseite',
    products: 'Produkte',
  },
  relatedProducts: {
    title: 'Ihr Setup vervollständigen',
    subtitle: 'Finden Sie passendes Zubehör und entdecken Sie ähnliche Produkte.',
    tabsLabel: 'Passende Produkte',
  },
  productCard: {
    viewProduct: 'Produkt ansehen',
    detailsFailed: 'Details konnten nicht geladen werden',
    unavailable: 'Nicht mehr verfügbar',
    priceOnRequest: 'Preis auf Anfrage',
  },
  theme: {
    switchToDark: 'Zum dunklen Modus wechseln',
    switchToLight: 'Zum hellen Modus wechseln',
  },
  language: {
    change: 'Sprache ändern',
  },
  common: {
    retry: 'Erneut versuchen',
    errorTitle: 'Da ist etwas schiefgelaufen',
    notFoundTitle: 'Nichts gefunden',
    retryAll: 'Alle erneut versuchen',
  },
}

/** Shape of all UI texts, derived from the German messages. */
export type MessageSchema = typeof de

export default de
