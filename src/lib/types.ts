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

/* ---------- generated: everything within 10 km of the roads we drive ---------- */

export interface CorridorPoi {
  n: string;               // name
  la: number;
  ln: number;
  k: "sight" | "food";
  c: string;               // OSM category
  /** [[km, dayIndex], ...] for every day passing within 10 km, nearest first */
  ring?: [number, number][];
  south?: [number, number][];
  oh?: string;             // OSM opening_hours — volunteer data, verify anything you rely on
  w?: string;              // website
  cu?: string;             // cuisine
  u?: 0 | 1;               // inside a town centre
  in?: 1;                  // already a planned stop
  wd?: 1;                  // has a wikidata link
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
  bookingRef?: string;
  terminal?: string;
  seats?: string;
  notes?: string;
}

export interface CarHire {
  company: string;
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

export interface Trip {
  title: string;
  travellers: Traveller[];
  flights: Flight[];
  car?: CarHire;
  bookings: Booking[];     // one per night
  tours: TourBooking[];
  emergency?: Record<string, string>;
}
