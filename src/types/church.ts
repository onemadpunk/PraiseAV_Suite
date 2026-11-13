export type ServiceItemType =
  | 'preservice'
  | 'song'
  | 'scripture'
  | 'prayer'
  | 'sermon'
  | 'presentation'
  | 'offering'
  | 'communion'
  | 'announcement';

export interface PraiseSlide {
  id: string;
  label: string; // e.g. "Verse 1", "Chorus", "Matthew 5:14", "Point 1"
  bodyText: string;
  lowerThirdText: string;
  stageMonitorNote: string;
  backgroundStyle: 'deep-navy' | 'warm-charcoal' | 'emerald-liturgy' | 'crimson-cross' | 'clean-black';
}

export interface ServiceItem {
  id: string;
  type: ServiceItemType;
  title: string;
  subtitle?: string;
  durationSeconds: number;
  leader: string;
  songId?: string;
  musicalKey?: string;
  arrangementOverride?: string[]; // This service only; repeat sections without changing the library song.
  scriptureRef?: string;
  scriptureTranslation?: 'NIV' | 'ESV' | 'KJV' | 'NLT';
  scriptureText?: string;
  externalMediaName?: string; // e.g. PowerPoint .pptx, Guest Speaker PDF, or Moving Background video
  stageNotes: string;
  audioCue: string;
  lightingCue: string;
  customSlides?: PraiseSlide[];
  sermonMedia?: SermonMedia[];
  // A PowerPoint or PDF sent through the church cloud; PraiseAV makes slides from it.
  presentationFile?: CloudMedia;
}

export interface CloudMedia {
  id: string; name: string; kind: 'video' | 'audio' | 'presentation'; fileName: string;
  sha256: string; bytes: number;
  via?: 'cloud' | 'folder'; // 'cloud': sent through the church cloud (any device)
}
export interface SermonMedia extends CloudMedia {
  afterSlide: number;
}
export interface SermonDraft {
  id: string; planId: string; title: string; notes: string;
  slides: PraiseSlide[]; media: SermonMedia[]; updatedAt: string;
}

export type RotaDepartment =
  | 'Band & Vocals'
  | 'Praise AV & Tech'
  | 'Hospitality & Welcome'
  | 'Kids & Youth';

export interface RotaAssignment {
  id: string;
  memberId: string;
  memberName: string;
  memberEmailHash?: string;
  department: RotaDepartment;
  role: string;
  status: 'Confirmed' | 'Pending' | 'Declined';
}

export interface ServicePlan {
  id: string;
  title: string;
  seriesTitle: string;
  date: string; // YYYY-MM-DD
  serviceTimes: string[]; // e.g. ["09:00", "11:00"]
  targetDurationMinutes: number;
  items: ServiceItem[];
  rota: RotaAssignment[];
  sermonAssignments?: Record<string, string>;
  // Set when the worship leader presses "Let the team know" (utils/teamNotices.ts).
  teamNotice?: { sentAt: string; sentBy: string };
}

export interface Song {
  id: string;
  title: string;
  author: string;
  ccliNumber: string;
  defaultKey: string;
  bpm: number;
  timeSignature: '4/4' | '3/4' | '6/8';
  themes: string[];
  arrangement: string[];
  chordPro: string;
  lastScheduled: string;
}

export interface Member {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  household: string;
  status: 'Member' | 'Regular Attender' | 'Staff / Elder' | 'Newcomer';
  departments: RotaDepartment[];
  qualifiedRoles: string[];
  dbsStatus: 'Cleared' | 'Pending Renewal' | 'Not Required';
  blockoutDates: string[]; // YYYY-MM-DD
  attendanceRate: number;
  joinedDate: string;
  pastoralNotes: string;
}

export interface CheckInChild {
  id: string;
  childName: string;
  ageGroup: 'Nursery (0–2)' | 'Sparks (3–5)' | 'Trailblazers (6–10)' | 'Youth (11–17)';
  room: string;
  guardianName: string;
  guardianPhone: string;
  medicalAlert: string;
  securityCode: string;
  pagerCode?: string; // Public page reference, never used to release a child.
  checkedInAt: string | null;
  checkedOutAt: string | null;
  serviceDate: string;
}

/** Something shared with a small group: a study sheet, a Drive link, notes for the week. */
export interface GroupMaterial {
  id: string;
  title: string;
  link: string; // Optional web link (Google Drive, YouTube, a PDF). '' when it is just a note.
  note: string;
  sharedAt: string; // YYYY-MM-DD
}

export interface SmallGroup {
  id: string;
  name: string;
  category: string; // e.g. 'Home Group', 'Bible Study'
  leaderName: string;
  meetingDay: string;
  meetingTime: string;
  location: string;
  currentMembers: number; // Kept for older records; memberIds is the real list when present.
  maxCapacity: number;
  currentStudy: string;
  active: boolean;
  /** Ids from People. Only names are resolved by people who can read People; others see a count. */
  memberIds?: string[];
  materials?: GroupMaterial[];
}

/**
 * Stored in the "bookings" collection. kind 'room' is one of the church's own rooms,
 * set up by an administrator (date and times are empty). Anything else is a booking.
 */
export interface RoomBooking {
  id: string;
  kind?: 'room' | 'booking';
  roomName: string;
  eventTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  organizer: string;
  avRequired: boolean;
  setupNotes: string; // For a room: what it has, e.g. "Seats 40, has a TV".
}

/**
 * One entry in the giving record. Most entries are a collection total
 * (e.g. "Sunday morning collection") with no name. Naming the giver is optional
 * and only finance and administrators can read giving at all.
 */
export interface DonationRecord {
  id: string;
  date: string;
  amount: number;
  source?: string; // How it came in: "Sunday morning collection", "Bank transfer", ...
  fund: string; // What it is for: "General fund", "Building fund", ...
  method: string;
  donorName: string; // '' when not named.
  household?: string;
  note?: string;
  reference?: string;
  giftAidEligible?: boolean; // Older records only. The Suite no longer uses Gift Aid.
}
