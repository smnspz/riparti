/**
 * A person who can share the cost of one or more trip legs.
 */
export interface Passenger {
  /** Stable identifier referenced by legs. */
  id: string
  /** Human-readable name included in the result. */
  name: string
}

/**
 * One stage of a trip, travelled with a fixed set of passengers.
 */
export interface Leg {
  /** One-way distance in kilometres. Must be greater than zero. */
  distanceKm: number
  /** Average fuel consumption in litres per 100 km. Must be non-negative. */
  fuelConsumptionLPer100Km: number
  /** Fuel price in integer euro cents per litre. Must be a non-negative integer. */
  fuelPriceCentsPerLiter: number
  /** Toll cost in integer euro cents for one direction. Defaults to 0. */
  tollCents?: number
  /** Whether distance and tolls are doubled for a return trip. Defaults to false. */
  roundTrip?: boolean
  /** Identifiers of the passengers present on this leg. At least one is required. */
  passengerIds: string[]
}

/**
 * A full trip, made of one or more legs and the passengers that may join them.
 */
export interface Trip {
  /** Every passenger that can appear on a leg. Must have unique ids. */
  passengers: Passenger[]
  /** Legs in travel order. May be empty, in which case the trip costs nothing. */
  legs: Leg[]
}

/**
 * The part of a single leg's cost owed by one passenger.
 */
export interface PassengerShare {
  /** Identifier of the passenger sharing the leg. */
  passengerId: string
  /** Amount owed for this leg, in integer euro cents. */
  amountCents: number
}

/**
 * Cost breakdown of a single leg.
 */
export interface LegResult {
  /** Zero-based position of the leg in the trip. */
  index: number
  /** Whether the leg was billed as a return trip. */
  roundTrip: boolean
  /** Effective distance in kilometres, doubled when the leg is a return trip. */
  distanceKm: number
  /** Fuel burned on the leg, in litres. */
  liters: number
  /** Fuel cost in integer euro cents, rounded once at leg level. */
  fuelCostCents: number
  /** Effective toll cost in integer euro cents, doubled on a return trip. */
  tollCents: number
  /** Fuel plus tolls, in integer euro cents. */
  totalCents: number
  /** Per-passenger split of `totalCents`, in input order. */
  shares: PassengerShare[]
}

/**
 * Total amount owed by one passenger across the whole trip.
 */
export interface PassengerResult {
  /** Identifier of the passenger. */
  id: string
  /** Human-readable name of the passenger. */
  name: string
  /** Sum of the passenger's shares across every leg, in integer euro cents. */
  totalCents: number
}

/**
 * Full result of a trip calculation.
 */
export interface TripResult {
  /** Sum of every leg total, in integer euro cents. */
  totalCents: number
  /** Per-leg breakdown, in travel order. */
  legs: LegResult[]
  /** Total owed by each passenger, in input order. */
  passengers: PassengerResult[]
}
