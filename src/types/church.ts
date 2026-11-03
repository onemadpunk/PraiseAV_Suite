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

export interface SmallGroup {
  id: string;
  name: string;
  category: 'Home Group' | 'Bible Study' | 'Youth & Young Adults' | 'Discipleship Course';
  leaderName: string;
  meetingDay: string;
  meetingTime: string;
  location: string;
  currentMembers: number;
  maxCapacity: number;
  currentStudy: string;
  active: boolean;
}

export interface RoomBooking {
  id: string;
  roomName: 'Main Sanctuary' | 'Fellowship Hall' | 'Youth Loft' | 'AV Broadcast Suite' | 'Kids Wing';
  eventTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  organizer: string;
  avRequired: boolean;
  setupNotes: string;
}

export interface DonationRecord {
  id: string;
  donorName: string;
  household: string;
  amount: number;
  fund: 'General Ministry Fund' | 'Building & AV Upgrade' | 'Community Foodbank' | 'Youth Camp Bursary';
  method: 'Standing Order (Bank)' | 'BACS Transfer' | 'Cash Offering' | 'Contactless Terminal';
  giftAidEligible: boolean;
  date: string;
  reference: string;
}
