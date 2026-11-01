import {
  CheckInChild,
  DonationRecord,
  Member,
  RoomBooking,
  ServicePlan,
  SmallGroup,
  Song,
} from '../types/church';

export const INITIAL_SONGS: Song[] = [
  {
    id: 'song-1',
    title: 'Cornerstone (My Hope Is Built)',
    author: 'Edward Mote, Jonas Myrin, Reuben Morgan, Eric Liljero',
    ccliNumber: '6158927',
    defaultKey: 'C',
    bpm: 71,
    timeSignature: '4/4',
    themes: ['Christ', 'Foundation', 'Trust', 'Grace'],
    arrangement: ['Intro', 'Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Bridge', 'Chorus'],
    lastScheduled: '2026-10-25',
    chordPro: `[Verse 1]
[C]My hope is built on nothing less
[F]Than Jesus' blood and [G]righteousness
[Am]I dare not trust the [F]sweetest frame
[C/E]But wholly [G]trust in [C]Jesus' Name

[Chorus]
Christ a[F]lone, [Am]Corner[G]stone
Weak made [C/E]strong in the [F]Saviour's [Am]love [G]
Through the [C]storm, [F]He is [Am]Lord
[G]Lord of [C]all

[Verse 2]
[C]When darkness seems to hide His face
[F]I rest on His un[G]changing grace
[Am]In every high and [F]stormy gale
[C/E]My anchor [G]holds with[C]in the veil

[Bridge]
[Am]When He shall [F]come with [G]trumpet sound
[Am]Oh may I [F]then in [G]Him be found
[C/E]Dressed in His [F]righteous[Am]ness a[G]lone
Faultless [F]stand be[G]fore the [C]throne`,
  },
  {
    id: 'song-2',
    title: 'Build My Life',
    author: 'Brett Younker, Karl Martin, Kirby Kaple, Matt Redman, Pat Barrett',
    ccliNumber: '7070345',
    defaultKey: 'G',
    bpm: 70,
    timeSignature: '4/4',
    themes: ['Devotion', 'Holiness', 'Worship', 'Surrender'],
    arrangement: ['Verse 1', 'Verse 2', 'Chorus', 'Bridge', 'Chorus'],
    lastScheduled: '2026-10-18',
    chordPro: `[Verse 1]
[G]Worthy of ev'ry [C]song we could ever sing
[G/B]Worthy of all the [C]praise we could ever bring
[G]Worthy of ev'ry [C]breath we could ever breathe
We live for [Am]You, we live for [C]You

[Verse 2]
[G]Jesus the name a[C]bove ev'ry other name
[G/B]Jesus the only [C]one who could ever save
[G]Worthy of ev'ry [C]breath we could ever breathe
We live for [Am]You, we live for [C]You

[Chorus]
[C]Holy, there is no one [Am]like You
There is none be[G/B]side You, open up my [Em]eyes in wonder
[C]Show me who You [Am]are and fill me
With Your [G/B]heart and lead me in Your [Em]love to those around me

[Bridge]
[C]I will build my [D]life upon Your [Em]love
It is a [G/B]firm foundation
[C]I will put my [D]trust in You a[Em]lone
And I will [G/B]not be shaken`,
  },
  {
    id: 'song-3',
    title: '10,000 Reasons (Bless the Lord)',
    author: 'Jonas Myrin, Matt Redman',
    ccliNumber: '6016351',
    defaultKey: 'G',
    bpm: 73,
    timeSignature: '4/4',
    themes: ['Praise', 'Gratitude', 'Benediction', 'Morning'],
    arrangement: ['Chorus', 'Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Verse 3', 'Chorus'],
    lastScheduled: '2026-10-11',
    chordPro: `[Chorus]
Bless the [C]Lord, O my [G]soul, [D/F#]O my [Em]soul
[C]Worship His [G]holy [Dsus4]name [D]
Sing like [C]never be[Em]fore, [C]O my [D]soul [Em]
I'll [C]worship Your [D]holy [G]name

[Verse 1]
The [C]sun comes [G]up, it's a [D]new day [Em]dawning
[C]It's time to [G]sing Your [D]song a[Em]gain
What[C]ever may [G]pass and what[D]ever lies be[Em]fore me
[C]Let me be [G]singing when the [Dsus4]evening [D]comes [G]

[Verse 2]
You're [C]rich in [G]love and You're [D]slow to [Em]anger
Your [C]name is [G]great and Your [D]heart is [Em]kind
For [C]all Your [G]goodness I will [D]keep on [Em]singing
[C]Ten thousand [G]reasons for my [Dsus4]heart to [D]find [G]`,
  },
  {
    id: 'song-4',
    title: 'In Christ Alone',
    author: 'Keith Getty, Stuart Townend',
    ccliNumber: '3350395',
    defaultKey: 'D',
    bpm: 76,
    timeSignature: '3/4',
    themes: ['Gospel', 'Cross', 'Resurrection', 'Assurance'],
    arrangement: ['Verse 1', 'Verse 2', 'Verse 3', 'Verse 4'],
    lastScheduled: '2026-10-04',
    chordPro: `[Verse 1]
In [G]Christ a[D]lone my [Em]hope is [A]found
He is my [G]light, my [A]strength, my [D]song
This Corner[G]stone, this [D]solid [Em]Ground
Firm through the [G]fiercest [A]drought and [D]storm
What heights of [G]love, what [D]depths of [A]peace
When fears are [G]stilled, when [Bm]strivings [A]cease
My Comfor[G]ter, my [D]All in [Em]All
Here in the [G]love of [A]Christ I [D]stand

[Verse 2]
In [G]Christ a[D]lone Who [Em]took on [A]flesh
Fullness of [G]God in [A]helpless [D]babe
This gift of [G]love and [D]righteous[Em]ness
Scorned by the [G]ones He [A]came to [D]save
Till on that [G]cross as [D]Jesus [A]died
The wrath of [G]God was [Bm]satis[A]fied
For every [G]sin on [D]Him was [Em]laid
Here in the [G]death of [A]Christ I [D]live`,
  },
  {
    id: 'song-5',
    title: 'Goodness of God',
    author: 'Ben Fielding, Brian Johnson, Ed Cash, Jason Ingram, Jenn Johnson',
    ccliNumber: '7117726',
    defaultKey: 'A',
    bpm: 63,
    timeSignature: '4/4',
    themes: ['Faithfulness', 'Testimony', 'Mercy', 'Goodness'],
    arrangement: ['Verse 1', 'Chorus', 'Verse 2', 'Chorus', 'Bridge', 'Chorus'],
    lastScheduled: '2026-10-25',
    chordPro: `[Verse 1]
I love You [A]Lord, oh Your [D]mercy never [A]fails me
[E/G#]All my [F#m]days, I've been [D]held in Your [E]hands
From the moment that I [F#m]wake up, [D]until I lay my [A]head [E/G#] [F#m]
Oh I will [D]sing of the [E]goodness of [A]God

[Chorus]
[D]All my life You have been [A]faithful
[D]All my life You have been [A]so, so [E]good
With every [D]breath that I am [A]able [E/G#] [F#m]
Oh I will [D]sing of the [E]goodness of [A]God

[Bridge]
[A/C#]Your goodness is [D]running after, it's [E]running after [A]me
[A/C#]Your goodness is [D]running after, it's [E]running after [A]me
With my [A/C#]life laid [D]down, I'm sur[E]rendered [F#m]now
I give You [D]every[E]thing
[A/C#]Your goodness is [D]running after, it's [E]running after [A]me`,
  },
  {
    id: 'song-6',
    title: 'Be Thou My Vision',
    author: 'Dallan Forgaill, Mary Elizabeth Byrne, Eleanor Henrietta Hull',
    ccliNumber: '30639',
    defaultKey: 'Eb',
    bpm: 84,
    timeSignature: '3/4',
    themes: ['Hymn', 'Wisdom', 'Guidance', 'Devotion'],
    arrangement: ['Verse 1', 'Verse 2', 'Verse 3', 'Verse 4'],
    lastScheduled: '2026-09-27',
    chordPro: `[Verse 1]
[Eb]Be Thou my Vision, O [Ab]Lord of my [Eb]heart
[Bb]Naught be all [Cm]else to me, [Ab]save that Thou [Bb]art
[Cm]Thou my best [Ab]Thought, by [Eb]day or by [Ab]night
[Eb]Waking or [Cm]sleeping, Thy [Ab]presence my [Eb]light

[Verse 2]
[Eb]Be Thou my Wisdom, and [Ab]Thou my true [Eb]Word
[Bb]I ever [Cm]with Thee and [Ab]Thou with me, [Bb]Lord
[Cm]Thou my great [Ab]Father, and [Eb]I Thy true [Ab]son
[Eb]Thou in me [Cm]dwelling, and [Ab]I with Thee [Eb]one

[Verse 3]
[Eb]High King of Heaven, my [Ab]victory [Eb]won
[Bb]May I reach [Cm]Heaven's joys, [Ab]O bright Heaven's [Bb]Sun
[Cm]Heart of my [Ab]own heart, what[Eb]ever be[Ab]fall
[Eb]Still be my [Cm]Vision, O [Ab]Ruler of [Eb]all`,
  },
];

export const INITIAL_MEMBERS: Member[] = [
  {
    id: 'mem-1',
    fullName: 'Hannah Vance',
    email: 'hannah.vance@gracecommunity.org.uk',
    phone: '+44 7700 900412',
    household: 'Vance Household',
    status: 'Staff / Elder',
    departments: ['Band & Vocals'],
    qualifiedRoles: ['Worship Leader', 'Acoustic Guitar', 'Keys / Piano'],
    dbsStatus: 'Cleared',
    blockoutDates: ['2026-11-15'],
    attendanceRate: 96,
    joinedDate: '2019-03-14',
    pastoralNotes: 'Director of Worship & Liturgy. Coordinates weekly Praise AV song templates.',
  },
  {
    id: 'mem-2',
    fullName: 'Marcus Sterling',
    email: 'marcus.sterling@gracecommunity.org.uk',
    phone: '+44 7700 900891',
    household: 'Sterling Household',
    status: 'Member',
    departments: ['Praise AV & Tech'],
    qualifiedRoles: ['Praise AV Operator', 'Livestream Director', 'Stage Lighting'],
    dbsStatus: 'Cleared',
    blockoutDates: [],
    attendanceRate: 98,
    joinedDate: '2020-09-01',
    pastoralNotes: 'Lead AV Engineer. Maintains Praise AV sanctuary projection rig and livestream feeds.',
  },
  {
    id: 'mem-3',
    fullName: 'Caleb Osei',
    email: 'caleb.osei@outlook.com',
    phone: '+44 7700 900319',
    household: 'Osei Household',
    status: 'Member',
    departments: ['Band & Vocals', 'Praise AV & Tech'],
    qualifiedRoles: ['Keys / Piano', 'MD / Click Track', 'FOH Sound Engineer'],
    dbsStatus: 'Cleared',
    blockoutDates: ['2026-11-08'],
    attendanceRate: 92,
    joinedDate: '2021-01-20',
    pastoralNotes: 'Runs Ableton cues and MIDI triggers synced with Praise AV.',
  },
  {
    id: 'mem-4',
    fullName: 'Elena Rostova',
    email: 'elena.rostova@gmail.com',
    phone: '+44 7700 900554',
    household: 'Rostova Household',
    status: 'Member',
    departments: ['Praise AV & Tech'],
    qualifiedRoles: ['Praise AV Operator', 'Camera 1 Operator'],
    dbsStatus: 'Cleared',
    blockoutDates: [],
    attendanceRate: 90,
    joinedDate: '2022-05-11',
    pastoralNotes: 'Trained on Praise AV on-the-fly lyric edits and NIV scripture live lookup.',
  },
  {
    id: 'mem-5',
    fullName: 'Rev. David Alistair',
    email: 'david.alistair@gracecommunity.org.uk',
    phone: '+44 7700 900101',
    household: 'Alistair Household',
    status: 'Staff / Elder',
    departments: ['Hospitality & Welcome'],
    qualifiedRoles: ['Senior Pastor', 'Preacher', 'Communion Celebrant'],
    dbsStatus: 'Cleared',
    blockoutDates: [],
    attendanceRate: 100,
    joinedDate: '2016-06-01',
    pastoralNotes: 'Uploads sermon slides and preacher timer notes directly to Praise Suite by Friday 4pm.',
  },
  {
    id: 'mem-6',
    fullName: 'Naomi Chen',
    email: 'naomi.chen@me.com',
    phone: '+44 7700 900673',
    household: 'Chen Household',
    status: 'Member',
    departments: ['Band & Vocals'],
    qualifiedRoles: ['Backing Vocals', 'Acoustic Guitar', 'Worship Leader'],
    dbsStatus: 'Cleared',
    blockoutDates: ['2026-11-22'],
    attendanceRate: 88,
    joinedDate: '2021-11-07',
    pastoralNotes: 'Leads youth worship on 2nd Sundays.',
  },
  {
    id: 'mem-7',
    fullName: 'Toby Gallagher',
    email: 'toby.gallagher@btinternet.com',
    phone: '+44 7700 900720',
    household: 'Gallagher Household',
    status: 'Member',
    departments: ['Band & Vocals', 'Praise AV & Tech'],
    qualifiedRoles: ['Drums / Percussion', 'FOH Sound Engineer'],
    dbsStatus: 'Not Required',
    blockoutDates: [],
    attendanceRate: 91,
    joinedDate: '2020-02-15',
    pastoralNotes: 'Available for both 9am and 11am gatherings.',
  },
  {
    id: 'mem-8',
    fullName: 'Rachel Mensah',
    email: 'rachel.mensah@gracecommunity.org.uk',
    phone: '+44 7700 900944',
    household: 'Mensah Household',
    status: 'Staff / Elder',
    departments: ['Kids & Youth'],
    qualifiedRoles: ['Kids Ministry Lead', 'Safeguarding Coordinator', 'Sparks Leader'],
    dbsStatus: 'Cleared',
    blockoutDates: [],
    attendanceRate: 97,
    joinedDate: '2018-09-10',
    pastoralNotes: 'Oversees Sunday Check-In terminals, congregation parent alerts, and DBS renewals.',
  },
  {
    id: 'mem-9',
    fullName: 'Samuel Lindqvist',
    email: 'sam.lindqvist@proton.me',
    phone: '+44 7700 900288',
    household: 'Lindqvist Household',
    status: 'Regular Attender',
    departments: ['Hospitality & Welcome'],
    qualifiedRoles: ['Foyer Host', 'Coffee Barista', 'Usher / Steward'],
    dbsStatus: 'Not Required',
    blockoutDates: ['2026-11-01'],
    attendanceRate: 84,
    joinedDate: '2024-04-02',
    pastoralNotes: 'Completed newcomer welcome course in May.',
  },
  {
    id: 'mem-10',
    fullName: 'Chloe Pritchard',
    email: 'chloe.pritchard@gmail.com',
    phone: '+44 7700 900615',
    household: 'Pritchard Household',
    status: 'Member',
    departments: ['Kids & Youth', 'Hospitality & Welcome'],
    qualifiedRoles: ['Trailblazers Leader', 'Nursery Team', 'Foyer Host'],
    dbsStatus: 'Pending Renewal',
    blockoutDates: [],
    attendanceRate: 89,
    joinedDate: '2022-01-09',
    pastoralNotes: 'DBS 3-year renewal submitted October 2026.',
  },
];

export const INITIAL_SERVICE_PLANS: ServicePlan[] = [
  {
    id: 'plan-2026-11-01',
    title: 'All Saints Sunday — Living Stones',
    seriesTitle: 'First Peter: Exiles & Citizens of Grace',
    date: '2026-11-01',
    serviceTimes: ['09:00', '11:00'],
    targetDurationMinutes: 75,
    lastSyncedToPraiseAV: '2026-11-01T08:42:00Z',
    items: [
      {
        id: 'item-1',
        type: 'preservice',
        title: '5-Minute Sanctuary Countdown & Welcome Loop',
        subtitle: 'All Saints Sunday · Moving Background + Notices',
        durationSeconds: 300,
        leader: 'Marcus Sterling',
        stageNotes: 'Start Praise AV moving background loop 5 mins prior to 09:00. Fade walk-in audio at 0:10.',
        audioCue: 'Spotify Walk-in Bus -6dB -> Fade Out',
        lightingCue: 'Preset 1: Warm House 60% / Stage Amber',
      },
      {
        id: 'item-2',
        type: 'song',
        title: 'Cornerstone (My Hope Is Built)',
        subtitle: 'Congregational Call to Worship',
        durationSeconds: 270,
        leader: 'Hannah Vance',
        songId: 'song-1',
        musicalKey: 'C',
        stageNotes: 'Start on Piano + Vocal only for Verse 1; full band enters on Chorus 1.',
        audioCue: 'Click 71 BPM · Hannah Lead Vox + Keys',
        lightingCue: 'Preset 2: Deep Navy + Warm Key Light',
      },
      {
        id: 'item-3',
        type: 'song',
        title: 'Build My Life',
        subtitle: 'Continuous Transition in G',
        durationSeconds: 310,
        leader: 'Hannah Vance',
        songId: 'song-2',
        musicalKey: 'G',
        stageNotes: 'Pad transition from C to G. Hold spontaneous prayer moment after Bridge.',
        audioCue: 'Click 70 BPM · Swell Pad in G',
        lightingCue: 'Preset 3: Sanctuary Gold Wash',
      },
      {
        id: 'item-4',
        type: 'prayer',
        title: 'Welcome, Family News & Kids Blessing',
        subtitle: 'Dismissal to Sparks, Trailblazers & Youth Loft',
        durationSeconds: 360,
        leader: 'Rachel Mensah',
        stageNotes: 'Use Praise AV Congregation Alert overlay if any parent needs paging during service.',
        audioCue: 'Handheld Mic 2 (Rachel) Unmute',
        lightingCue: 'Preset 4: House Up 45% for Kids Dismissal',
      },
      {
        id: 'item-5',
        type: 'scripture',
        title: 'Scripture Reading: 1 Peter 2:4–10 (NIV)',
        subtitle: 'The Living Stone and a Chosen People',
        durationSeconds: 180,
        leader: 'Naomi Chen',
        scriptureRef: '1 Peter 2:4–10',
        scriptureTranslation: 'NIV',
        scriptureText:
          'As you come to him, the living Stone—rejected by humans but chosen by God and precious to him—you also, like living stones, are being built into a spiritual house to be a holy priesthood, offering spiritual sacrifices acceptable to God through Jesus Christ. For in Scripture it says: "See, I lay a stone in Zion, a chosen and precious cornerstone, and the one who trusts in him will never be put to shame." But you are a chosen people, a royal priesthood, a holy nation, God\'s special possession, that you may declare the praises of him who called you out of darkness into his wonderful light. Once you were not a people, but now you are the people of God; once you had not received mercy, but now you have received mercy.',
        stageNotes: 'Advance Praise AV NIV scripture slides evenly as Naomi reads from lectern.',
        audioCue: 'Lectern Mic Unmute',
        lightingCue: 'Preset 5: Center Lectern Spot',
      },
      {
        id: 'item-6',
        type: 'sermon',
        title: 'Living Stones in a Fractured Age',
        subtitle: 'Part 4 · 1 Peter 2:4–10 (Includes Preacher Timer & Notes)',
        durationSeconds: 1980,
        leader: 'Rev. David Alistair',
        stageNotes: 'Praise AV Preacher Timer set to 33:00 countdown. Trigger livestream lower-thirds on points 1–3.',
        audioCue: 'Headset Mic 1 (David) + Livestream Bus',
        lightingCue: 'Preset 6: Broadcast Sermon Key (5600K Clean)',
        customSlides: [
          {
            id: 'serm-slide-1',
            label: 'Sermon Title',
            bodyText: 'Living Stones in a Fractured Age\n1 Peter 2:4–10 · Rev. David Alistair',
            lowerThirdText: 'Living Stones in a Fractured Age — Rev. David Alistair (1 Peter 2:4–10)',
            stageMonitorNote: 'Preacher Timer Active (33:00) · Point 1 coming at ~08:00',
            backgroundStyle: 'warm-charcoal',
          },
          {
            id: 'serm-slide-2',
            label: 'Point 1',
            bodyText: '1. Chosen & Precious Before the World Calls You Useful\nOur identity rests on the Cornerstone, not cultural applause.',
            lowerThirdText: '1. Chosen & Precious Before the World Calls You Useful',
            stageMonitorNote: 'Preacher Note: Share Augustine illustration next · Check timer',
            backgroundStyle: 'warm-charcoal',
          },
          {
            id: 'serm-slide-3',
            label: 'Point 2',
            bodyText: '2. Built Together into a Spiritual House\nThere are no solitary rolling stones in the New Testament church.',
            lowerThirdText: '2. Built Together into a Spiritual House (1 Peter 2:5)',
            stageMonitorNote: 'Preacher Note: Transition to response moment after Point 3',
            backgroundStyle: 'warm-charcoal',
          },
          {
            id: 'serm-slide-4',
            label: 'Point 3',
            bodyText: '3. Called Out of Darkness into His Wonderful Light\nMercy received becomes mercy extended to our neighbors.',
            lowerThirdText: '3. Called Out of Darkness into His Wonderful Light (1 Peter 2:9)',
            stageMonitorNote: 'Preacher Note: Invite Worship Band back to stage now',
            backgroundStyle: 'warm-charcoal',
          },
        ],
      },
      {
        id: 'item-7',
        type: 'song',
        title: 'Goodness of God',
        subtitle: 'Ministry & Response Song (Transposed to G)',
        durationSeconds: 300,
        leader: 'Hannah Vance',
        songId: 'song-5',
        musicalKey: 'G',
        stageNotes: 'Note: Transposed down from A to G for congregational singing.',
        audioCue: 'Click 63 BPM · Soft Keys Intro under Prayer',
        lightingCue: 'Preset 2: Deep Navy + Warm Key Light',
      },
      {
        id: 'item-8',
        type: 'offering',
        title: 'Tithes, Offerings & Benediction',
        subtitle: 'Zero-Fee Giving & Fellowship Hall Invitation',
        durationSeconds: 240,
        leader: 'Rev. David Alistair',
        stageNotes: 'Show Giving & Coffee Fellowship slide in Praise AV.',
        audioCue: 'Headset Mic 1 + Post-Service Acoustic Playlist',
        lightingCue: 'Preset 7: Full House 100%',
      },
    ],
    rota: [
      {
        id: 'rota-1',
        memberId: 'mem-1',
        memberName: 'Hannah Vance',
        department: 'Band & Vocals',
        role: 'Worship Leader',
        status: 'Confirmed',
      },
      {
        id: 'rota-2',
        memberId: 'mem-3',
        memberName: 'Caleb Osei',
        department: 'Band & Vocals',
        role: 'Keys / Piano',
        status: 'Confirmed',
      },
      {
        id: 'rota-3',
        memberId: 'mem-6',
        memberName: 'Naomi Chen',
        department: 'Band & Vocals',
        role: 'Acoustic Guitar',
        status: 'Confirmed',
      },
      {
        id: 'rota-4',
        memberId: 'mem-7',
        memberName: 'Toby Gallagher',
        department: 'Band & Vocals',
        role: 'Drums / Percussion',
        status: 'Confirmed',
      },
      {
        id: 'rota-5',
        memberId: 'mem-2',
        memberName: 'Marcus Sterling',
        department: 'Praise AV & Tech',
        role: 'Praise AV Operator',
        status: 'Confirmed',
      },
      {
        id: 'rota-6',
        memberId: 'mem-4',
        memberName: 'Elena Rostova',
        department: 'Praise AV & Tech',
        role: 'Camera 1 Operator',
        status: 'Pending',
      },
      {
        id: 'rota-7',
        memberId: 'mem-8',
        memberName: 'Rachel Mensah',
        department: 'Kids & Youth',
        role: 'Kids Ministry Lead',
        status: 'Confirmed',
      },
      {
        id: 'rota-8',
        memberId: 'mem-10',
        memberName: 'Chloe Pritchard',
        department: 'Hospitality & Welcome',
        role: 'Foyer Host',
        status: 'Confirmed',
      },
    ],
  },
  {
    id: 'plan-2026-11-08',
    title: 'Remembrance Sunday — Peace That Endures',
    seriesTitle: 'First Peter: Exiles & Citizens of Grace',
    date: '2026-11-08',
    serviceTimes: ['09:00', '10:45'],
    targetDurationMinutes: 80,
    items: [
      {
        id: 'item-201',
        type: 'preservice',
        title: 'Remembrance Sunday Welcome & Poppy Tribute Slide',
        subtitle: 'Includes 2-Minute Silence Cue at 11:00 AM',
        durationSeconds: 240,
        leader: 'Elena Rostova',
        stageNotes: 'Keep Praise AV preacher clock visible for exact 11:00:00 two-minute silence.',
        audioCue: 'Chime Bell Cue Ready',
        lightingCue: 'Preset: Crimson Poppy Wash',
      },
      {
        id: 'item-202',
        type: 'song',
        title: 'Be Thou My Vision',
        subtitle: 'Opening Hymn in Eb',
        durationSeconds: 250,
        leader: 'Naomi Chen',
        songId: 'song-6',
        musicalKey: 'Eb',
        stageNotes: 'Acoustic + Cello + Piano arrangement.',
        audioCue: 'No Click · Natural Tempo 84 BPM',
        lightingCue: 'Warm Sanctuary Wash',
      },
      {
        id: 'item-203',
        type: 'song',
        title: 'In Christ Alone',
        subtitle: 'Congregational Declaration in D',
        durationSeconds: 290,
        leader: 'Hannah Vance',
        songId: 'song-4',
        musicalKey: 'D',
        stageNotes: 'Full congregation a cappella on final stanza.',
        audioCue: 'Drop Instruments on Verse 4 Line 1',
        lightingCue: 'House Lights Up 40%',
      },
      {
        id: 'item-204',
        type: 'scripture',
        title: 'Scripture Reading: Psalm 46:1–11 (NIV)',
        subtitle: 'God Is Our Refuge and Strength',
        durationSeconds: 210,
        leader: 'Rev. David Alistair',
        scriptureRef: 'Psalm 46:1–11',
        scriptureTranslation: 'NIV',
        scriptureText:
          'God is our refuge and strength, an ever-present help in trouble. Therefore we will not fear, though the earth give way and the mountains fall into the heart of the sea. He makes wars cease to the ends of the earth. He breaks the bow and shatters the spear; he burns the shields with fire. He says, "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth." The Lord Almighty is with us; the God of Jacob is our fortress.',
        stageNotes: 'Advance slide on "He makes wars cease".',
        audioCue: 'Lectern Mic',
        lightingCue: 'Sermon Key',
      },
      {
        id: 'item-205',
        type: 'sermon',
        title: 'The Fortress Unshaken by Empires',
        subtitle: 'Remembrance Sunday Message',
        durationSeconds: 1800,
        leader: 'Rev. David Alistair',
        stageNotes: '30-minute preacher timer.',
        audioCue: 'Headset Mic 1',
        lightingCue: 'Sermon Key',
      },
      {
        id: 'item-206',
        type: 'song',
        title: '10,000 Reasons (Bless the Lord)',
        subtitle: 'Closing Praise & Benediction',
        durationSeconds: 280,
        leader: 'Hannah Vance',
        songId: 'song-3',
        musicalKey: 'G',
        stageNotes: 'Upbeat outro chorus.',
        audioCue: 'Click 73 BPM',
        lightingCue: 'Full Warm Stage + House',
      },
    ],
    rota: [
      {
        id: 'rota-201',
        memberId: 'mem-1',
        memberName: 'Hannah Vance',
        department: 'Band & Vocals',
        role: 'Worship Leader',
        status: 'Confirmed',
      },
      {
        id: 'rota-202',
        memberId: 'mem-4',
        memberName: 'Elena Rostova',
        department: 'Praise AV & Tech',
        role: 'Praise AV Operator',
        status: 'Confirmed',
      },
      {
        id: 'rota-203',
        memberId: 'mem-7',
        memberName: 'Toby Gallagher',
        department: 'Praise AV & Tech',
        role: 'FOH Sound Engineer',
        status: 'Pending',
      },
    ],
  },
];

export const INITIAL_CHECKINS: CheckInChild[] = [
  {
    id: 'chk-1',
    childName: 'Leo Vance',
    ageGroup: 'Sparks (3–5)',
    room: 'Kids Wing — Room B',
    guardianName: 'Hannah Vance',
    guardianPhone: '+44 7700 900412',
    medicalAlert: 'Peanut Allergy (EpiPen in Kids Medical Locker #2)',
    securityCode: 'K-8491',
    checkedInAt: '08:47',
    checkedOutAt: null,
    serviceDate: '2026-11-01',
  },
  {
    id: 'chk-2',
    childName: 'Maya Sterling',
    ageGroup: 'Trailblazers (6–10)',
    room: 'Kids Wing — Room C',
    guardianName: 'Marcus Sterling',
    guardianPhone: '+44 7700 900891',
    medicalAlert: 'None',
    securityCode: 'K-3104',
    checkedInAt: '08:51',
    checkedOutAt: null,
    serviceDate: '2026-11-01',
  },
  {
    id: 'chk-3',
    childName: 'Noah Sterling',
    ageGroup: 'Nursery (0–2)',
    room: 'Kids Wing — Crèche A',
    guardianName: 'Marcus Sterling',
    guardianPhone: '+44 7700 900891',
    medicalAlert: 'Dairy Free snacks only',
    securityCode: 'K-3104',
    checkedInAt: '08:51',
    checkedOutAt: null,
    serviceDate: '2026-11-01',
  },
  {
    id: 'chk-4',
    childName: 'Zoe Mensah',
    ageGroup: 'Youth (11–17)',
    room: 'Youth Loft',
    guardianName: 'Rachel Mensah',
    guardianPhone: '+44 7700 900944',
    medicalAlert: 'None',
    securityCode: 'K-5920',
    checkedInAt: '08:54',
    checkedOutAt: null,
    serviceDate: '2026-11-01',
  },
  {
    id: 'chk-5',
    childName: 'Ethan Gallagher',
    ageGroup: 'Trailblazers (6–10)',
    room: 'Kids Wing — Room C',
    guardianName: 'Toby Gallagher',
    guardianPhone: '+44 7700 900720',
    medicalAlert: 'Mild Asthma (Inhaler in backpack)',
    securityCode: 'K-7723',
    checkedInAt: null,
    checkedOutAt: null,
    serviceDate: '2026-11-01',
  },
  {
    id: 'chk-6',
    childName: 'Aria Osei',
    ageGroup: 'Sparks (3–5)',
    room: 'Kids Wing — Room B',
    guardianName: 'Caleb Osei',
    guardianPhone: '+44 7700 900319',
    medicalAlert: 'None',
    securityCode: 'K-6218',
    checkedInAt: '08:56',
    checkedOutAt: null,
    serviceDate: '2026-11-01',
  },
];

export const INITIAL_SMALL_GROUPS: SmallGroup[] = [
  {
    id: 'sg-1',
    name: 'Northside Midweek Table',
    category: 'Home Group',
    leaderName: 'Hannah & Luke Vance',
    meetingDay: 'Wednesday',
    meetingTime: '19:30',
    location: '14 Oakfield Terrace (Northside)',
    currentMembers: 11,
    maxCapacity: 14,
    currentStudy: '1 Peter: Living Hope in Exile',
    active: true,
  },
  {
    id: 'sg-2',
    name: 'Riverside Young Adults',
    category: 'Youth & Young Adults',
    leaderName: 'Caleb Osei & Naomi Chen',
    meetingDay: 'Thursday',
    meetingTime: '19:00',
    location: 'Youth Loft (Church Campus)',
    currentMembers: 18,
    maxCapacity: 24,
    currentStudy: 'Sermon on the Mount Practicals',
    active: true,
  },
  {
    id: 'sg-3',
    name: 'Early Morning Men’s Scripture & Prayer',
    category: 'Bible Study',
    leaderName: 'Rev. David Alistair',
    meetingDay: 'Tuesday',
    meetingTime: '07:00',
    location: 'Fellowship Hall & Coffee Bar',
    currentMembers: 9,
    maxCapacity: 15,
    currentStudy: 'Psalms of Ascent (Psalms 120–134)',
    active: true,
  },
  {
    id: 'sg-4',
    name: 'Autumn Exploring Faith Course',
    category: 'Discipleship Course',
    leaderName: 'Samuel Lindqvist & Chloe Pritchard',
    meetingDay: 'Wednesday',
    meetingTime: '19:15',
    location: 'Fellowship Hall',
    currentMembers: 14,
    maxCapacity: 20,
    currentStudy: 'Week 5: Why and How Do I Pray?',
    active: true,
  },
];

export const INITIAL_ROOM_BOOKINGS: RoomBooking[] = [
  {
    id: 'rb-1',
    roomName: 'Main Sanctuary',
    eventTitle: 'Thursday Worship Band & Praise AV Tech Rehearsal',
    date: '2026-11-05',
    startTime: '19:00',
    endTime: '21:15',
    organizer: 'Hannah Vance',
    avRequired: true,
    setupNotes: 'Full stage monitor mix + Praise AV lyric & chord confidence test.',
  },
  {
    id: 'rb-2',
    roomName: 'Fellowship Hall',
    eventTitle: 'Community Foodbank & Warm Welcome Café',
    date: '2026-11-03',
    startTime: '10:00',
    endTime: '14:00',
    organizer: 'Samuel Lindqvist',
    avRequired: false,
    setupNotes: '8 round tables, urns heated by 09:30.',
  },
  {
    id: 'rb-3',
    roomName: 'Youth Loft',
    eventTitle: 'Riverside Young Adults Gathering',
    date: '2026-11-05',
    startTime: '19:00',
    endTime: '21:30',
    organizer: 'Caleb Osei',
    avRequired: true,
    setupNotes: 'Portable Praise AV HDMI output to 75" Youth TV.',
  },
  {
    id: 'rb-4',
    roomName: 'AV Broadcast Suite',
    eventTitle: 'Praise AV Volunteer Onboarding Workshop',
    date: '2026-11-07',
    startTime: '10:00',
    endTime: '12:00',
    organizer: 'Marcus Sterling',
    avRequired: true,
    setupNotes: 'Training new Sunday volunteers on Praise AV (praiseav.com) EasyWorship import and livestream lower-thirds.',
  },
];

export const INITIAL_DONATIONS: DonationRecord[] = [
  {
    id: 'don-1',
    donorName: 'Vance Household',
    household: 'Vance Household',
    amount: 450,
    fund: 'General Ministry Fund',
    method: 'Standing Order (Bank)',
    giftAidEligible: true,
    date: '2026-11-01',
    reference: 'SO-VANCE-1126',
  },
  {
    id: 'don-2',
    donorName: 'Sterling Household',
    household: 'Sterling Household',
    amount: 320,
    fund: 'Building & AV Upgrade',
    method: 'BACS Transfer',
    giftAidEligible: true,
    date: '2026-10-30',
    reference: 'BACS-PRAISEAV-RIG',
  },
  {
    id: 'don-3',
    donorName: 'Alistair Household',
    household: 'Alistair Household',
    amount: 500,
    fund: 'General Ministry Fund',
    method: 'Standing Order (Bank)',
    giftAidEligible: true,
    date: '2026-10-28',
    reference: 'SO-ALISTAIR-1026',
  },
  {
    id: 'don-4',
    donorName: 'Sunday Morning Cash Basket',
    household: 'Anonymous / Plate',
    amount: 185,
    fund: 'Community Foodbank',
    method: 'Cash Offering',
    giftAidEligible: false,
    date: '2026-10-25',
    reference: 'CASH-SUN-1025',
  },
  {
    id: 'don-5',
    donorName: 'Osei Household',
    household: 'Osei Household',
    amount: 275,
    fund: 'General Ministry Fund',
    method: 'Standing Order (Bank)',
    giftAidEligible: true,
    date: '2026-10-25',
    reference: 'SO-OSEI-1026',
  },
  {
    id: 'don-6',
    donorName: 'Gallagher Household',
    household: 'Gallagher Household',
    amount: 150,
    fund: 'Youth Camp Bursary',
    method: 'BACS Transfer',
    giftAidEligible: true,
    date: '2026-10-22',
    reference: 'BACS-YOUTHCAMP',
  },
];
