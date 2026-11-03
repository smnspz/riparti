import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { readStoredLanguage, type Language } from '@/i18n'
import { haversineKm, type LatLng } from '@/lib/geo'
import { readStoredPayPalHandle } from '@/lib/payment'
import { fetchRoadRoutes, type RoutePreference } from '@/lib/routing'
import type { LegDraft, PassengerDraft } from '@/types'
import { createDebouncedStorage, resolveStorage } from './persistStorage'
import {
  SEED_LABELS,
  SEED_PASSENGERS,
  createSeedLeg,
  isSeedLeg,
} from './seedTrip'

/** Storage key holding the saved trip. */
export const TRIP_STORAGE_KEY = 'backseat.trip'

/** How long two edits to the same target merge into one undo step. */
const HISTORY_COALESCE_MS = 800

/** Maximum number of undo steps kept in memory. */
const HISTORY_LIMIT = 50

/** Draft state restored by undo and redo. */
export interface TripSnapshot {
  /** Passengers declared on the trip. */
  passengers: PassengerDraft[]
  /** Legs declared on the trip. */
  legs: LegDraft[]
  /** Id of the passenger who paid, if chosen. */
  paidById: string | null
}

/** Part of the store written to local storage. */
interface PersistedTrip extends TripSnapshot {
  /** PayPal.Me handle used for payment requests. */
  paypalHandle: string
}

/** State and actions of the trip editor. */
export interface TripStore extends TripSnapshot {
  /** PayPal.Me handle used for payment requests. */
  paypalHandle: string
  /** Undo stack, oldest snapshot first. */
  past: TripSnapshot[]
  /** Redo stack, next snapshot last. */
  future: TripSnapshot[]
  /** Whether the settings dialog is open. */
  settingsOpen: boolean
  /** Key of the last recorded edit, used to merge bursts of typing. */
  historyKey: string | null
  /** Time of the last recorded edit, in milliseconds. */
  historyAt: number
  /** Add a passenger with an already trimmed, unique name. */
  addPassenger: (name: string) => void
  /** Remove a passenger and their membership from every leg. */
  removePassenger: (passengerId: string) => void
  /** Append an empty leg above the existing ones. */
  addLeg: () => void
  /** Remove one leg from the trip. */
  removeLeg: (legId: string) => void
  /** Remove every leg. */
  clearLegs: () => void
  /** Apply a partial update to one leg, without recording undo history. */
  updateLeg: (legId: string, patch: Partial<LegDraft>) => void
  /** Replace the passengers present on a leg. */
  setLegPassengers: (legId: string, passengerIds: string[]) => void
  /** Set one endpoint from a place search and request its road route. */
  setEndpoint: (
    legId: string,
    field: 'start' | 'end',
    point: LatLng,
    label: string,
    formatDistanceKm: (km: number) => string,
  ) => void
  /** Show one of the computed route options. */
  selectRoute: (
    legId: string,
    preference: RoutePreference,
    formatDistanceKm: (km: number) => string,
  ) => void
  /** Choose who paid the trip, or nobody. */
  setPaidBy: (passengerId: string | null) => void
  /** Update the PayPal.Me handle used for payment requests. */
  setPaypalHandle: (handle: string) => void
  /** Open or close the settings dialog. */
  setSettingsOpen: (open: boolean) => void
  /** Re-label the example leg for the given language. */
  localizeSeed: (language: Language) => void
  /** Request the road route for the example leg, if it still needs one. */
  routeSeedLeg: (formatDistanceKm: (km: number) => string) => void
  /** Restore the state before the last recorded edit. */
  undo: () => void
  /** Reapply the last undone edit. */
  redo: () => void
}

/** Latest route request per leg, so a stale response cannot win. */
const routeRequestIds = new Map<string, number>()

/**
 * Copy the part of the state that undo and redo restore.
 *
 * The drafts are updated immutably, so sharing the arrays is safe.
 *
 * @param state - Store state to snapshot.
 * @returns A snapshot of the trip drafts.
 */
function snapshotOf(state: TripSnapshot): TripSnapshot {
  return {
    passengers: state.passengers,
    legs: state.legs,
    paidById: state.paidById,
  }
}

/**
 * Push the current trip onto the undo stack.
 *
 * Edits sharing a key within {@link HISTORY_COALESCE_MS} merge into a single
 * step, so a run of endpoint changes on the same field undoes at once.
 *
 * @param state - Store state before the edit.
 * @param key - Coalescing key, or null for a discrete edit.
 * @param now - Current time in milliseconds.
 * @returns The history fields to merge into the next state.
 */
function historyFor(
  state: TripStore,
  key: string | null,
  now: number,
): Pick<TripStore, 'past' | 'future' | 'historyKey' | 'historyAt'> {
  // Merge with the previous edit when it targeted the same thing
  if (
    key !== null &&
    key === state.historyKey &&
    now - state.historyAt < HISTORY_COALESCE_MS
  ) {
    return {
      past: state.past,
      future: [],
      historyKey: key,
      historyAt: now,
    }
  }

  // Record a new step, dropping the oldest when the stack is full
  const past = [...state.past, snapshotOf(state)]
  const trimmed =
    past.length > HISTORY_LIMIT ? past.slice(-HISTORY_LIMIT) : past
  return {
    past: trimmed,
    future: [],
    historyKey: key,
    historyAt: now,
  }
}

/**
 * Repair a leg read back from storage.
 *
 * A routing request cannot resume after a reload, so a leg that was loading
 * becomes idle. Legs that kept their geometry are ready to draw again.
 *
 * @param leg - Leg restored from storage.
 * @returns The leg with a route status matching its geometry.
 */
function normalizeStoredLeg(leg: LegDraft): LegDraft {
  if (leg.route !== null) {
    return { ...leg, routeStatus: 'ready' }
  }
  return { ...leg, routeStatus: leg.routeStatus === 'error' ? 'error' : 'idle' }
}

/**
 * Trip editor state, shared by the sidebar, the map, and the results.
 *
 * The trip drafts and the undo history live here; the calculation result stays
 * derived from them in the components that need it.
 */
export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => {
      /**
       * Fetch the road routes for a leg and store the geometry and options.
       *
       * Only the latest request for a leg is applied, and a response is
       * dropped when the endpoints changed while it was in flight.
       *
       * @param legId - Identifier of the leg to route.
       * @param start - Start point used for the request.
       * @param end - End point used for the request.
       * @param formatDistanceKm - Formatter for the route distance.
       * @returns Nothing. Resolves after the editor state has been updated.
       */
      async function loadRoutes(
        legId: string,
        start: LatLng,
        end: LatLng,
        formatDistanceKm: (km: number) => string,
      ): Promise<void> {
        // Track this request as the latest one for the leg
        const requestId = (routeRequestIds.get(legId) ?? 0) + 1
        routeRequestIds.set(legId, requestId)
        set((state) => ({
          legs: state.legs.map((leg) =>
            leg.id === legId ? { ...leg, routeStatus: 'loading' } : leg,
          ),
        }))

        try {
          // Ask Valhalla for the fastest and toll-free routes
          const options = await fetchRoadRoutes(start, end)
          if (routeRequestIds.get(legId) !== requestId) {
            return
          }

          // Show the fastest route and keep every option for the picker
          const selected = options[0]
          if (selected === undefined) {
            set((state) => ({
              legs: state.legs.map((leg) =>
                leg.id === legId ? { ...leg, routeStatus: 'error' } : leg,
              ),
            }))
            return
          }

          set((state) => ({
            legs: state.legs.map((leg) =>
              leg.id === legId && leg.start === start && leg.end === end
                ? {
                    ...leg,
                    route: selected.points,
                    routeOptions: options,
                    routePreference: selected.preference,
                    routeStatus: 'ready',
                    distanceKm: formatDistanceKm(selected.distanceKm),
                  }
                : leg,
            ),
          }))
        } catch {
          if (routeRequestIds.get(legId) !== requestId) {
            return
          }

          // Fall back to the straight line already drawn between the endpoints
          set((state) => ({
            legs: state.legs.map((leg) =>
              leg.id === legId && leg.start === start && leg.end === end
                ? {
                    ...leg,
                    route: null,
                    routeOptions: [],
                    routePreference: null,
                    routeStatus: 'error',
                  }
                : leg,
            ),
          }))
        }
      }

      return {
        passengers: SEED_PASSENGERS,
        legs: [createSeedLeg(readStoredLanguage())],
        paidById: null,
        paypalHandle: readStoredPayPalHandle(),
        past: [],
        future: [],
        settingsOpen: false,
        historyKey: null,
        historyAt: 0,

        addPassenger: (name) =>
          set((state) => ({
            ...historyFor(state, null, Date.now()),
            passengers: [
              ...state.passengers,
              { id: crypto.randomUUID(), name },
            ],
          })),

        removePassenger: (passengerId) =>
          set((state) => ({
            ...historyFor(state, null, Date.now()),
            passengers: state.passengers.filter(
              (passenger) => passenger.id !== passengerId,
            ),
            legs: state.legs.map((leg) => ({
              ...leg,
              passengerIds: leg.passengerIds.filter((id) => id !== passengerId),
            })),
            paidById: state.paidById === passengerId ? null : state.paidById,
          })),

        addLeg: () =>
          set((state) => {
            if (state.passengers.length === 0) {
              return {}
            }

            // Reuse the first leg's fuel settings as a sensible default
            const template = state.legs.at(0)
            const leg: LegDraft = {
              id: crypto.randomUUID(),
              start: null,
              startLabel: '',
              end: null,
              endLabel: '',
              route: null,
              routeOptions: [],
              routePreference: null,
              routeStatus: 'idle',
              distanceKm: '',
              fuelConsumption: template?.fuelConsumption ?? '6.5',
              fuelPriceEuros: template?.fuelPriceEuros ?? '1.89',
              tollsEuros: '0.00',
              roundTrip: false,
              passengerIds: state.passengers.map((passenger) => passenger.id),
            }

            // Prepend the leg so it appears above the existing ones
            return {
              ...historyFor(state, null, Date.now()),
              legs: [leg, ...state.legs],
            }
          }),

        removeLeg: (legId) =>
          set((state) => ({
            ...historyFor(state, null, Date.now()),
            legs: state.legs.filter((leg) => leg.id !== legId),
          })),

        clearLegs: () =>
          set((state) => ({
            ...historyFor(state, null, Date.now()),
            legs: [],
          })),

        updateLeg: (legId, patch) =>
          set((state) => ({
            legs: state.legs.map((leg) =>
              leg.id === legId ? { ...leg, ...patch } : leg,
            ),
          })),

        setLegPassengers: (legId, passengerIds) =>
          set((state) => ({
            ...historyFor(state, null, Date.now()),
            legs: state.legs.map((leg) =>
              leg.id === legId ? { ...leg, passengerIds } : leg,
            ),
          })),

        setEndpoint: (legId, field, point, label, formatDistanceKm) => {
          const leg = get().legs.find((candidate) => candidate.id === legId)
          if (leg === undefined) {
            return
          }

          // Measure the straight line until the road route arrives
          const otherPoint = field === 'start' ? leg.end : leg.start
          const distanceKm =
            otherPoint === null
              ? leg.distanceKm
              : formatDistanceKm(
                  field === 'start'
                    ? haversineKm(point, otherPoint)
                    : haversineKm(otherPoint, point),
                )
          const endpoint =
            field === 'start'
              ? { start: point, startLabel: label }
              : { end: point, endLabel: label }

          set((state) => ({
            ...historyFor(state, `endpoint:${legId}:${field}`, Date.now()),
            legs: state.legs.map((candidate) =>
              candidate.id === legId
                ? {
                    ...candidate,
                    ...endpoint,
                    distanceKm,
                    route: null,
                    routeOptions: [],
                    routePreference: null,
                    routeStatus: otherPoint === null ? 'idle' : 'loading',
                  }
                : candidate,
            ),
          }))

          if (otherPoint !== null) {
            void loadRoutes(
              legId,
              field === 'start' ? point : otherPoint,
              field === 'start' ? otherPoint : point,
              formatDistanceKm,
            )
          }
        },

        selectRoute: (legId, preference, formatDistanceKm) =>
          set((state) => {
            const leg = state.legs.find(
              (candidate) => candidate.id === legId,
            )
            const option = leg?.routeOptions.find(
              (candidate) => candidate.preference === preference,
            )
            if (leg === undefined || option === undefined) {
              return {}
            }

            return {
              ...historyFor(state, null, Date.now()),
              legs: state.legs.map((candidate) =>
                candidate.id === legId
                  ? {
                      ...candidate,
                      route: option.points,
                      routePreference: option.preference,
                      distanceKm: formatDistanceKm(option.distanceKm),
                      tollsEuros:
                        option.preference === 'no-tolls'
                          ? '0.00'
                          : candidate.tollsEuros,
                    }
                  : candidate,
              ),
            }
          }),

        setPaidBy: (passengerId) => set({ paidById: passengerId }),

        setPaypalHandle: (handle) => set({ paypalHandle: handle }),

        setSettingsOpen: (open) => set({ settingsOpen: open }),

        localizeSeed: (language) =>
          set((state) => {
            if (!state.legs.some(isSeedLeg)) {
              return {}
            }

            const labels = SEED_LABELS[language]
            return {
              legs: state.legs.map((leg) =>
                isSeedLeg(leg)
                  ? { ...leg, startLabel: labels.start, endLabel: labels.end }
                  : leg,
              ),
            }
          }),

        routeSeedLeg: (formatDistanceKm) => {
          const leg = get().legs.find(isSeedLeg)
          if (
            leg === undefined ||
            leg.routeStatus !== 'loading' ||
            leg.start === null ||
            leg.end === null
          ) {
            return
          }
          void loadRoutes(leg.id, leg.start, leg.end, formatDistanceKm)
        },

        undo: () =>
          set((state) => {
            const previous = state.past.at(-1)
            if (previous === undefined) {
              return {}
            }

            return {
              ...previous,
              past: state.past.slice(0, -1),
              future: [...state.future, snapshotOf(state)],
              historyKey: null,
            }
          }),

        redo: () =>
          set((state) => {
            const next = state.future.at(-1)
            if (next === undefined) {
              return {}
            }

            return {
              ...next,
              past: [...state.past, snapshotOf(state)],
              future: state.future.slice(0, -1),
              historyKey: null,
            }
          }),
      }
    },
    {
      name: TRIP_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() =>
        createDebouncedStorage(resolveStorage()),
      ),
      partialize: (state): PersistedTrip => ({
        passengers: state.passengers,
        legs: state.legs,
        paidById: state.paidById,
        paypalHandle: state.paypalHandle,
      }),
      merge: (persistedState, currentState) => {
        const stored = persistedState as Partial<PersistedTrip> | undefined
        if (stored === undefined) {
          return currentState
        }

        return {
          ...currentState,
          ...stored,
          legs: (stored.legs ?? currentState.legs).map(normalizeStoredLeg),
          // History and dialogs always start fresh after a reload
          past: [],
          future: [],
          settingsOpen: false,
          historyKey: null,
          historyAt: 0,
        }
      },
    },
  ),
)
