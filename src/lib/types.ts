/** Trip data shapes. Generated files come from ../data/generated, hand-entered
 *  booking data lives in ../data/trip.json. */

export type LatLng = [number, number];

/* ---------- generated: the route, built and verified against OSRM ---------- */

export interface Poi {
  name: string;
  lat: number;
  lng: number;
  search: string;          // Google Maps query string — name, not coordinates
  cat: string;
  dwell: number;           // minutes
  ticket: boolean;
  hike: boolean;
  price: number;           // ISK
  note?: string | null;
  activity?: string | null;
  mx?: string;             // routing proxy key when the pin is off the road network
}

export interface Stop {
  loc: string;             // key into Itinerary["poi"]
  dwell: number;
}

export interface Day {
  date: string;            // "Oct 3"
  title: string;
  start: string;           // "08:00"
  stops: Stop[];
}

export interface Itinerary {
  planId: string;
  days: Day[];
  poi: Record<string, Poi>;
  keys: string[];
  dur: number[][];         // minutes, OSRM raw (pad ×1.15 for October)
  dist: number[][];        // km
  geo: Record<string, LatLng[]>;   // "from|to" -> road polyline
  isk_eur: number;
}

/* ---------- database: everything within 10 km of the roads we drive ---------- */

export type PlaceKind = "attraction" | "food" | "fuel" | "grocery" | "stay";

export interface Place {
  id: string;
  name: string;
  lat: number;
  lng: number;
  kind: PlaceKind;
  cat: string;
  /** [[km, dayIndex], ...] for EVERY day whose road passes within 10 km, nearest first.
   *  A list, not a single day — 1,400+ places sit on more than one day's route. */
  days: [number, number][];
  town: boolean;
  phone?: string;
  website?: string;
  address?: string;
  hours?: string;          // OSM volunteer data — often missing or stale
  email?: string;
  wheelchair?: string;
  wikidata?: string;
  planned?: boolean;       // attractions only: already a stop in the itinerary
  brand?: string;          // fuel and groceries
  cuisine?: string;
  vegetarian?: boolean;
  vegan?: boolean;
  self_service?: boolean;
  stars?: string;
}

export interface DaySummary {
  day: number;
  date: string;
  title: string;
  routeKm: number;
  counts: Record<string, number>;
  fuelOnRoute: number;
  longestFuelGapKm: number;
  longestFuelGapBetween: [string, string];
}

/* ---------- hand-entered: what we actually booked ---------- */

export interface Flight {
  direction: "out" | "home";
  airline: string;
  flightNo: string;
  from: string;            // IATA
  to: string;
  date: string;            // ISO "2026-10-02"
  depart: string;          // local "21:00"
  arrive: string;
  arriveDate?: string;     // set when the flight lands the next day
  fromName?: string;
  toName?: string;
  bookingRef?: string;
  terminal?: string;
  seats?: string;
  notes?: string;
}

export interface CarHire {
  company: string;
  customerNo?: string;
  classCode?: string;
  spec?: string;
  bookingRef?: string;
  model?: string;
  pickup: { place: string; date: string; time: string };
  dropoff: { place: string; date: string; time: string };
  insurance?: string;      // what's covered — gravel, sand & ash, SCDW
  phone?: string;
  notes?: string;
}

export interface Booking {
  night: number;           // 1..8
  date: string;            // ISO date of the night you sleep there
  town: string;
  property: string;
  address?: string;
  bookingRef?: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: string;
  price?: number;          // total, ISK
  breakfast?: boolean;
  lat?: number;
  lng?: number;
  notes?: string;
  /** Airbnb / Booking.com / Agoda — shown as a badge so we know which app to open */
  source?: string;
  bookedBy?: string;
  bookedSeparately?: boolean;
  /** true when someone else holds the booking and we still need the details */
  pending?: boolean;
}

export interface TourBooking {
  name: string;
  operator: string;
  date: string;            // ISO
  time: string;
  meetingPoint: string;
  bookingRef?: string;
  phone?: string;
  duration?: string;
  price?: number;
  notes?: string;
}

export interface Traveller {
  name: string;
  phone?: string;
  notes?: string;          // licence for driving, dietary, etc.
}

export interface TodoItem {
  what: string;
  owner: string;
  blocking: boolean;
}

export interface Trip {
  title: string;
  todo?: TodoItem[];
  travellers: Traveller[];
  flights: Flight[];
  car?: CarHire;
  bookings: Booking[];     // one per night
  tours: TourBooking[];
  emergency?: Record<string, string>;
}
