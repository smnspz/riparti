/** Languages supported by the app. */
export type Language = 'it' | 'en'

/** Values substituted into placeholders such as `{n}`. */
export type TranslationParams = Record<string, string | number>

/** Italian dictionary, the reference for every translation key. */
export const it = {
  'app.documentTitle': 'Backseat — Dividi carburante e pedaggi',
  'app.tagline': 'Dividi carburante e pedaggi, tratta per tratta.',
  'app.invalidTrip': 'Il viaggio non è valido.',

  'language.label': 'Lingua',
  'language.italian': 'Italiano',
  'language.english': 'Inglese',

  'settings.title': 'Impostazioni',
  'settings.description': "Lingua e aspetto dell'app.",
  'settings.open': 'Apri impostazioni',
  'settings.close': 'Chiudi impostazioni',
  'settings.language': 'Lingua',
  'settings.theme': 'Tema',

  'theme.system': 'Sistema',
  'theme.systemHint': 'Segue le impostazioni del dispositivo',
  'theme.light': 'Chiaro',
  'theme.lightHint': 'Sempre chiaro',
  'theme.dark': 'Scuro',
  'theme.darkHint': 'Sempre scuro',

  'passengers.title': 'Passeggeri',
  'passengers.empty': 'Aggiungi almeno un passeggero per iniziare un viaggio.',
  'passengers.remove': 'Rimuovi {name}',
  'passengers.nameLabel': 'Nome del passeggero',
  'passengers.addPlaceholder': 'Aggiungi un passeggero',
  'passengers.add': 'Aggiungi',
  'passengers.errorEmpty': 'Inserisci un nome per il passeggero.',
  'passengers.errorDuplicate': 'Questo passeggero esiste già.',

  'legs.title': 'Tratte',
  'legs.clear': 'Cancella',
  'legs.add': 'Aggiungi tratta',
  'legs.needPassenger':
    'Aggiungi un passeggero prima di aggiungere una tratta.',
  'legs.empty':
    'Nessuna tratta. Aggiungine una, poi cerca le città di partenza e arrivo.',

  'leg.title': 'Tratta {n}',
  'leg.remove': 'Rimuovi tratta {n}',
  'leg.from': 'Da',
  'leg.to': 'A',
  'leg.startLabel': 'Città di partenza della tratta {n}',
  'leg.endLabel': 'Città di arrivo della tratta {n}',
  'leg.searchStart': 'Cerca città di partenza',
  'leg.searchEnd': 'Cerca città di arrivo',
  'leg.route': 'Percorso',
  'leg.fastest': 'Più veloce',
  'leg.avoidTolls': 'Evita pedaggi',
  'leg.usesTolls': 'con pedaggi',
  'leg.noTolls': 'senza pedaggi',
  'leg.tollFreeHint':
    "Scegliendo un percorso senza pedaggi l'importo dei pedaggi diventa {amount}.",
  'leg.findingRoute': 'Calcolo del percorso stradale',
  'leg.routeError':
    'Percorso stradale non disponibile; uso una linea retta. Regola i km manualmente.',
  'leg.distance': 'Distanza (km)',
  'leg.consumption': 'Consumo (L/100 km)',
  'leg.fuelPrice': 'Prezzo carburante (€/L)',
  'leg.tolls': 'Pedaggi (€)',
  'leg.roundTrip': 'Andata e ritorno',
  'leg.roundTripHint': 'raddoppia km e pedaggi',
  'leg.passengers': 'Passeggeri su questa tratta',
  'leg.passengersOnLeg': 'Passeggeri sulla tratta {n}',
  'leg.addPassengerFirst': 'Aggiungi prima un passeggero.',

  'place.searchPlaceholder': 'Cerca una città…',
  'place.searching': 'Ricerca città in corso',
  'place.unavailable': 'Ricerca città non disponibile.',
  'place.typeMore': 'Digita almeno due caratteri.',
  'place.noResults': 'Nessuna città trovata.',

  'results.title': 'Risultato',
  'results.empty': 'Aggiungi una tratta per vedere la divisione.',
  'results.total': 'Totale viaggio',
  'results.perLeg': 'Per tratta',
  'results.roundTrip': 'andata e ritorno',
  'results.legSummary':
    '{distance} km · {liters} L · carburante {fuel} · pedaggi {tolls}',
  'results.legTotal': 'Totale {total} · {shares}',

  'map.legTooltip': '{name} · {distance} km',
  'map.emptyHint':
    'Aggiungi una tratta, poi cerca le città di partenza e arrivo per impostare il percorso.',
  'map.attribution': 'Percorsi stradali di Valhalla',

  'error.legNeedsPassenger': 'Tratta {n}: serve almeno un passeggero.',
  'error.legUnknownPassenger': 'Tratta {n}: passeggero sconosciuto ({id}).',
  'error.legDuplicatePassenger': 'Tratta {n}: passeggero ripetuto ({id}).',
  'error.duplicatePassenger': 'Passeggero ripetuto ({id}).',
  'error.distance': 'Tratta {n}: la distanza deve essere maggiore di 0.',
  'error.consumption':
    'Tratta {n}: il consumo deve essere maggiore o uguale a 0.',
  'error.fuelPrice':
    'Tratta {n}: il prezzo del carburante deve essere un numero intero di centesimi non negativo.',
  'error.tolls':
    'Tratta {n}: i pedaggi devono essere un numero intero di centesimi non negativo.',
}

/** Translation keys, derived from the Italian dictionary. */
export type TranslationKey = keyof typeof it

/** English dictionary, required to cover every Italian key. */
export const en: Record<TranslationKey, string> = {
  'app.documentTitle': 'Backseat — Split fuel and tolls',
  'app.tagline': 'Split fuel and tolls, leg by leg.',
  'app.invalidTrip': 'The trip is not valid.',

  'language.label': 'Language',
  'language.italian': 'Italian',
  'language.english': 'English',

  'settings.title': 'Settings',
  'settings.description': 'Language and appearance.',
  'settings.open': 'Open settings',
  'settings.close': 'Close settings',
  'settings.language': 'Language',
  'settings.theme': 'Theme',

  'theme.system': 'System',
  'theme.systemHint': 'Follows your device setting',
  'theme.light': 'Light',
  'theme.lightHint': 'Always light',
  'theme.dark': 'Dark',
  'theme.darkHint': 'Always dark',

  'passengers.title': 'Passengers',
  'passengers.empty': 'Add at least one passenger to start a trip.',
  'passengers.remove': 'Remove {name}',
  'passengers.nameLabel': 'Passenger name',
  'passengers.addPlaceholder': 'Add a passenger',
  'passengers.add': 'Add',
  'passengers.errorEmpty': 'Enter a passenger name.',
  'passengers.errorDuplicate': 'That passenger already exists.',

  'legs.title': 'Legs',
  'legs.clear': 'Clear',
  'legs.add': 'Add leg',
  'legs.needPassenger': 'Add a passenger before adding a leg.',
  'legs.empty':
    'No legs yet. Add one, then search for its start and end cities.',

  'leg.title': 'Leg {n}',
  'leg.remove': 'Remove leg {n}',
  'leg.from': 'From',
  'leg.to': 'To',
  'leg.startLabel': 'Start city of leg {n}',
  'leg.endLabel': 'End city of leg {n}',
  'leg.searchStart': 'Search start city',
  'leg.searchEnd': 'Search end city',
  'leg.route': 'Route',
  'leg.fastest': 'Fastest',
  'leg.avoidTolls': 'Avoid tolls',
  'leg.usesTolls': 'uses tolls',
  'leg.noTolls': 'no tolls',
  'leg.tollFreeHint':
    'Choosing a toll-free route sets the toll amount to {amount}.',
  'leg.findingRoute': 'Finding the road route',
  'leg.routeError':
    'Road routing unavailable; using a straight line. Adjust km manually.',
  'leg.distance': 'Distance (km)',
  'leg.consumption': 'Consumption (L/100 km)',
  'leg.fuelPrice': 'Fuel price (€/L)',
  'leg.tolls': 'Tolls (€)',
  'leg.roundTrip': 'Round trip',
  'leg.roundTripHint': 'doubles km and tolls',
  'leg.passengers': 'Passengers on this leg',
  'leg.passengersOnLeg': 'Passengers on leg {n}',
  'leg.addPassengerFirst': 'Add a passenger first.',

  'place.searchPlaceholder': 'Search a city…',
  'place.searching': 'Searching cities',
  'place.unavailable': 'City search unavailable.',
  'place.typeMore': 'Type at least two characters.',
  'place.noResults': 'No cities found.',

  'results.title': 'Result',
  'results.empty': 'Add a leg to see the split.',
  'results.total': 'Total trip',
  'results.perLeg': 'Per leg',
  'results.roundTrip': 'round trip',
  'results.legSummary': '{distance} km · {liters} L · fuel {fuel} · tolls {tolls}',
  'results.legTotal': 'Total {total} · {shares}',

  'map.legTooltip': '{name} · {distance} km',
  'map.emptyHint':
    'Add a leg, then search its start and end cities to set its route.',
  'map.attribution': 'Road routes by Valhalla',

  'error.legNeedsPassenger': 'Leg {n}: at least one passenger is required.',
  'error.legUnknownPassenger': 'Leg {n}: unknown passenger ({id}).',
  'error.legDuplicatePassenger': 'Leg {n}: duplicate passenger ({id}).',
  'error.duplicatePassenger': 'Duplicate passenger ({id}).',
  'error.distance': 'Leg {n}: distance must be greater than 0.',
  'error.consumption': 'Leg {n}: consumption must be greater than or equal to 0.',
  'error.fuelPrice':
    'Leg {n}: fuel price must be a non-negative integer number of cents.',
  'error.tolls':
    'Leg {n}: tolls must be a non-negative integer number of cents.',
}

/** Dictionaries indexed by language. */
export const messages: Record<Language, Record<TranslationKey, string>> = {
  it,
  en,
}

/** Signature of the translation function exposed to components. */
export type Translate = (
  key: TranslationKey,
  params?: TranslationParams,
) => string

/**
 * Translate a key for a language, replacing `{name}` placeholders.
 *
 * @param language - Language to translate into.
 * @param key - Translation key.
 * @param params - Optional values for placeholders.
 * @returns The translated string.
 */
export function translate(
  language: Language,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  // Initializations
  const template = messages[language][key]

  // Return the template unchanged when there is nothing to interpolate
  if (params === undefined) {
    return template
  }

  // Replace every placeholder with its provided value
  return template.replace(/\{(\w+)\}/g, (placeholder: string, name: string) => {
    const value = params[name]
    return value === undefined ? placeholder : String(value)
  })
}
