# Workflows and current limits

## Plan and export a service

Create an empty service with a name, date, and time. Add songs, a reading, sermon, slides, or a placeholder for a visitor's presentation. Each service can use different songs and sermon points. In **PraiseAV export**, click **Send to the booth**: once the booth computer is connected (church-setup.md, step 5), PraiseAV saves the file into its Services folder by itself and the Suite shows when it arrived. Alternatively, send its .praiseav file directly to the desktop app's Services folder in a browser that supports folder access, or download the file and open it in PraiseAV Windows. The folder choice is remembered in that browser; sending again updates the same file unless it has been changed outside the Suite. Songs without words are exported as a visible reminder to add licensed words in PraiseAV. For a visitor's presentation, click **Add PowerPoint or PDF** on its row (signed in, from any device): the file goes through the church cloud and PraiseAV makes slides from it when the service is opened. A placeholder without a file is exported as a reminder slide.

The Suite's cue and slide view is a local preview. It does not change the congregation projector. The desktop program handles live output. A shared OneDrive or Google Drive folder may transfer files between computers after the church has set it up. Folder transfer writes a service file only when the user clicks Send; it does not automatically update a service already open in PraiseAV.

## Prepare a sermon at home, run it on Sunday

The planner adds the sermon to Sunday’s service and identifies the preacher’s email in My sermon & tablet. That preacher opens My sermon & tablet, saves private notes and congregation slides separately, and adds video/music cues. Use --- between notes pages or congregation slides. Choose where each media cue plays, then Send my sermon to church. The planner also sends the complete running order through PraiseAV export. Each preacher publishes only their contribution, keeping the rest of the plan intact.

Link the church’s shared PraiseAV Services folder once in Chrome or Edge on a home computer. Video/music bytes are copied to its PraiseAV Assets subfolder and verified. Google Drive or OneDrive must sync that same folder to the booth; Firebase holds drafts and account permissions, not the media files. The desktop lists missing/incomplete files before loading and caches verified media when the operator opens the service. Loading a later update always needs an operator action; it cannot interrupt the live screen. Signed in, a preacher can also add a PowerPoint, PDF, video (up to 100 MB) or music (up to 50 MB) from any device, including an iPad: it travels through the church cloud instead, and PraiseAV turns PowerPoint and PDF pages into picture slides at that point in the sermon. Larger videos (up to 512 MB) need browser folder access on a computer. Supported media: MP4, WebM, MP3, WAV, M4A and OGG; slides: PPTX, PPT, ODP and PDF. Actual codec support also depends on the browser/desktop.

At church the tablet joins the local Wi-Fi and scans PraiseAV’s Remote QR code. The operator approves Band, Preacher or both once. Band follows the live song/slide automatically; Preacher uses the current sermon’s notes, slides, timer and video/music controls. No weekly tablet-to-sermon assignment is required. Approved devices are remembered on the same browser and church address. Open my Suite preparation links back to the church plan and remembers the live computer address; later Sundays can use Open church live views. The offline Band Music Stand remains a rehearsal file and does not itself receive live slide changes.

## Songs and musicians

The Suite can store church-licensed lyrics and ChordPro charts, show a transposed preview, and export a plain text song that PraiseAV can import. The complete service export carries ChordPro alongside words. The same song can have a different key and section order in each service. PraiseAV uses those choices for slides and band printouts without changing the library copy. The Band stand works on phones and tablets: choose a service, move between songs by buttons or swiping, choose a sounding key and capo, and print or save a songbook through the browser's print dialog. Personal key and capo choices do not change the service plan.

SongSelect and modern Bible translations may require the church's own licences. The Suite does not supply them. The sample leaves modern worship song lyrics and modern translation text empty.

## People, rotas, groups, rooms, giving

The People area stores contact details, blockout dates, and pastoral notes for authorised staff. A verified email or Google account can add its own name, contact number and household details before a church administrator approves access to shared records. Only that person and administrators can read this private profile; it is not yet a member-facing address book. Service rotas record assignments and status. The planner sees warnings for blockout dates and same-day double assignments before adding a volunteer; an override requires confirmation. New assignments start Pending. Each volunteer signs in, opens Band stand → My schedule, and answers I can serve or Can’t make it for each upcoming service (they can undo it). The planner sees the reply beside the rota entry, and it fills in a Pending status; a status the planner sets themselves still wins. Replies need the v3 church security rules: an administrator copies them from Church access when the Suite asks. Groups and rooms have basic records and a local overlap check for new bookings. The giving area records transactions for finance review. These are planning and record tools; automatic notifications, a payment processor, and HMRC submission are not implemented.

## Children and public alerts

Kids staff can record check-in and check-out, pickup codes, and medical notes. A public pager reference is separate from the pickup verification code. Parent page text can be copied to the PraiseAV desktop alert control. The Suite does not send it automatically and cannot verify who collects a child; staff must do so in person.

## Offline use

PraiseAV Windows runs independently and offline. Church mode needs a connection to Firebase to sign in and save shared records. Download backups regularly.

Administrator JSON backups include private sermon drafts as well as the running order. Media bytes remain in the shared Services/PraiseAV Assets folder and need their own folder backup. Restoring an older JSON without sermonDrafts leaves existing private drafts intact. After restoring drafts, republish any sermon that needs to reach the booth.

## Letting the band know

When the songs and keys are set, the worship leader presses **Let the team know** on the service. Everyone on that service's rota then sees **You're on the rota** at the top of Band stand (with a number on Band stand in the menu) until they answer **I can serve** or **Can't make it**; their answers show in the rota. **Tell the team again** repeats it after a change. **Copy team message** and **Email team** still work for anyone who doesn't open the Suite.
