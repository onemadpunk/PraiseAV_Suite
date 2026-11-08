// Each church installs these rules in its own Firebase project. A user owning
// the Google account named here can administer the church from a fresh project;
// every other person must be approved by an administrator in the Suite.
export const CHURCH_RULES_VERSION = 'v5';

export function churchRules(ownerEmail: string, includeDirectory = false): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) throw new Error('Enter a valid owner email first.');
  const owner = JSON.stringify(ownerEmail.trim().toLowerCase());
  return `// PraiseAV church rules ${CHURCH_RULES_VERSION}
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function verified() { return signedIn() && request.auth.token.email_verified == true; }
    function owner() {
      return verified()
        && request.auth.token.email == ${owner};
    }
    function membership() {
      return get(/databases/$(database)/documents/memberships/$(request.auth.uid));
    }
    function hasRole(role) {
      return verified()
        && exists(/databases/$(database)/documents/memberships/$(request.auth.uid))
        && role in membership().data.roles;
    }
    function admin() { return owner() || hasRole('admin'); }
    function approved() {
      return owner() || (verified() && exists(/databases/$(database)/documents/memberships/$(request.auth.uid)));
    }
    function validRecord(id) { return request.resource.data.id == id; }

    // A read-only capability probe lets Suite detect a church whose security
    // rules need updating. No document or write is required for this check.
    match /ruleCapabilities/{version} {
      allow get: if admin() && version == '${CHURCH_RULES_VERSION}';
      allow list, create, update, delete: if false;
    }

    ${includeDirectory ? `// PraiseAV's small registration index. No church records are stored here.
    function validPendingChurch(id) {
      return verified()
        && request.resource.data.keys().hasOnly(['churchName', 'town', 'nameKey', 'townKey', 'status', 'ownerUid', 'expiresAt'])
        && request.resource.data.keys().hasAll(['churchName', 'town', 'nameKey', 'townKey', 'status', 'ownerUid', 'expiresAt'])
        && request.resource.data.churchName is string && request.resource.data.churchName.size() <= 100
        && request.resource.data.town is string && request.resource.data.town.size() <= 100
        && request.resource.data.nameKey is string && request.resource.data.nameKey.matches('^[a-z0-9-]{3,80}$')
        && request.resource.data.townKey is string && request.resource.data.townKey.matches('^[a-z0-9-]{2,80}$')
        && id == request.resource.data.nameKey + '--' + request.resource.data.townKey
        && request.resource.data.status == 'setting-up'
        && request.resource.data.ownerUid == request.auth.uid
        && request.resource.data.expiresAt is timestamp
        && request.resource.data.expiresAt > request.time
        && request.resource.data.expiresAt <= request.time + duration.value(14, 'd');
    }
    match /churchDirectory/{id} {
      allow read: if true;
      allow create: if validPendingChurch(id);
      allow update: if (
        (resource.data.status == 'cancelled' || (
          resource.data.status == 'setting-up'
          && resource.data.expiresAt is timestamp
          && resource.data.expiresAt <= request.time
        ))
        && validPendingChurch(id)
      ) || (
        verified() && resource.data.ownerUid == request.auth.uid
        && resource.data.status == 'setting-up'
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'projectId', 'expiresAt'])
        && request.resource.data.status == 'ready'
        && request.resource.data.projectId is string
        && request.resource.data.projectId.matches('^[a-z0-9-]{6,100}$')
        && request.resource.data.expiresAt == null
      ) || (
        verified() && resource.data.ownerUid == request.auth.uid
        && resource.data.status == 'setting-up'
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status'])
        && request.resource.data.status == 'cancelled'
      );
      allow delete: if false;
    }` : ''}
    match /memberships/{uid} {
      allow read: if admin() || (verified() && request.auth.uid == uid);
      allow create, update: if admin() && request.resource.data.uid == uid
        && request.resource.data.roles is list
        && request.resource.data.roles.hasOnly(['admin', 'office_staff', 'planner', 'preacher', 'worship_leader', 'av', 'musician', 'people', 'kids', 'finance', 'member', 'family']);
      allow delete: if admin();
    }
    match /joinRequests/{uid} {
      allow read: if admin() || (verified() && request.auth.uid == uid);
      allow create, update: if verified() && request.auth.uid == uid
        && request.resource.data.uid == uid
        && request.resource.data.email == request.auth.token.email;
      allow delete: if admin();
    }
    match /profiles/{uid} {
      allow read: if admin() || (verified() && request.auth.uid == uid);
      allow create, update: if verified() && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['uid', 'email', 'displayName', 'contactNumber', 'householdName', 'familyNames', 'updatedAt'])
        && request.resource.data.keys().hasAll(['uid', 'email', 'displayName', 'contactNumber', 'householdName', 'familyNames', 'updatedAt'])
        && request.resource.data.uid == uid
        && request.resource.data.email == request.auth.token.email
        && request.resource.data.displayName is string && request.resource.data.displayName.size() <= 100
        && request.resource.data.contactNumber is string && request.resource.data.contactNumber.size() <= 40
        && request.resource.data.householdName is string && request.resource.data.householdName.size() <= 100
        && request.resource.data.familyNames is string && request.resource.data.familyNames.size() <= 200
        && request.resource.data.updatedAt is string;
      allow delete: if admin() || (verified() && request.auth.uid == uid);
    }
    // A separate opt-in projection. Staff notes, children, DBS and private profile fields
    // cannot enter the member directory through this collection.
    match /directoryListings/{uid} {
      allow read: if approved();
      allow create, update: if approved() && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['uid', 'displayName', 'householdName', 'email', 'contactNumber', 'showHousehold', 'showEmail', 'showPhone', 'consentVersion', 'consentAt'])
        && request.resource.data.keys().hasAll(['uid', 'displayName', 'householdName', 'email', 'contactNumber', 'showHousehold', 'showEmail', 'showPhone', 'consentVersion', 'consentAt'])
        && request.resource.data.uid == uid
        && request.resource.data.displayName is string
        && request.resource.data.displayName.size() > 0
        && request.resource.data.displayName.size() <= 100
        && request.resource.data.showHousehold is bool
        && request.resource.data.showEmail is bool
        && request.resource.data.showPhone is bool
        && request.resource.data.householdName is string
        && request.resource.data.householdName.size() <= 100
        && (!request.resource.data.showHousehold || request.resource.data.householdName.size() > 0)
        && (request.resource.data.showHousehold || request.resource.data.householdName == '')
        && request.resource.data.email is string
        && (request.resource.data.showEmail ? request.resource.data.email == request.auth.token.email : request.resource.data.email == '')
        && request.resource.data.contactNumber is string
        && request.resource.data.contactNumber.size() <= 40
        && (!request.resource.data.showPhone || request.resource.data.contactNumber.size() > 0)
        && (request.resource.data.showPhone || request.resource.data.contactNumber == '')
        && request.resource.data.consentVersion == 'v1'
        && request.resource.data.consentAt == request.time;
      allow delete: if admin() || (approved() && request.auth.uid == uid);
    }
    match /plans/{id} {
      allow read: if admin() || hasRole('planner') || hasRole('preacher') || hasRole('worship_leader') || hasRole('office_staff') || hasRole('av') || hasRole('musician');
      allow create, update: if (admin() || hasRole('planner') || hasRole('worship_leader')) && validRecord(id);
      allow delete: if admin() || hasRole('planner') || hasRole('worship_leader');
    }
    // Each volunteer's own replies to the rota (planId → Confirmed or Declined).
    // Only that person can write them; planners and administrators read them all.
    match /rotaReplies/{uid} {
      allow read: if admin() || hasRole('planner') || hasRole('worship_leader') || (approved() && request.auth.uid == uid);
      allow create, update: if approved() && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['uid', 'email', 'replies', 'updatedAt'])
        && request.resource.data.keys().hasAll(['uid', 'email', 'replies', 'updatedAt'])
        && request.resource.data.uid == uid
        && request.resource.data.email == request.auth.token.email
        && request.resource.data.replies is map
        && request.resource.data.replies.size() <= 200
        && request.resource.data.updatedAt is string;
      allow delete: if admin() || (approved() && request.auth.uid == uid);
    }
    // Files published for the booth computer. PraiseAV Windows, signed in with the
    // AV role, mirrors them into its Services folder and writes a receipt.
    function validDelivery(id) {
      return request.resource.data.keys().hasOnly(['id', 'fileName', 'text', 'hash', 'publishedAt', 'publishedBy'])
        && request.resource.data.keys().hasAll(['id', 'fileName', 'text', 'hash', 'publishedAt', 'publishedBy'])
        && request.resource.data.id == id
        && request.resource.data.fileName is string && request.resource.data.fileName.size() <= 200
        && request.resource.data.text is string && request.resource.data.text.size() <= 900000
        && request.resource.data.hash is string && request.resource.data.hash.matches('^[0-9a-f]{64}$')
        && request.resource.data.publishedAt is string
        && request.resource.data.publishedBy == request.auth.token.email;
    }
    match /deliveries/{planId} {
      function planner() { return admin() || hasRole('planner') || hasRole('worship_leader'); }
      allow read: if planner() || hasRole('av');
      allow create, update: if planner() && validDelivery(planId)
        && request.resource.data.fileName.matches('^PraiseAV Suite [A-Za-z0-9_-]{1,128}[.]praiseav$');
      allow delete: if planner();
      match /sermons/{itemId} {
        function assigned() {
          return hasRole('preacher')
            && get(/databases/$(database)/documents/plans/$(planId)).data.sermonAssignments[itemId] == request.auth.token.email;
        }
        allow get: if planner() || hasRole('av') || assigned();
        allow list: if planner() || hasRole('av');
        allow create, update: if (planner() || assigned()) && validDelivery(itemId)
          && request.resource.data.fileName == 'Sermon ' + planId + '--' + itemId + '.praiseav-sermon';
        allow delete: if planner();
      }
      // PowerPoint, PDF, video and music sent from any device: chunks first, then the record
      // (utils/cloudFiles.ts). Contents never change; the booth checks the SHA-256 and clears old files.
      match /files/{fileName} {
        function preacherHere() {
          return hasRole('preacher')
            && get(/databases/$(database)/documents/plans/$(planId)).data.sermonAssignments.values().hasAny([request.auth.token.email]);
        }
        function sender() { return planner() || preacherHere(); }
        allow get, list: if planner() || hasRole('av') || preacherHere();
        allow create: if sender()
          && fileName.matches('^[0-9a-f]{64}[.](mp4|webm|mp3|wav|m4a|ogg|pdf|pptx|ppt|odp)$')
          && request.resource.data.keys().hasOnly(['name', 'fileName', 'sha256', 'ext', 'kind', 'bytes', 'chunks', 'uploadedBy', 'uploadedAt'])
          && request.resource.data.keys().hasAll(['name', 'fileName', 'sha256', 'ext', 'kind', 'bytes', 'chunks', 'uploadedBy', 'uploadedAt'])
          && request.resource.data.fileName == fileName
          && request.resource.data.sha256 is string && request.resource.data.sha256.matches('^[0-9a-f]{64}$')
          && fileName == request.resource.data.sha256 + '.' + request.resource.data.ext
          && request.resource.data.kind in ['video', 'audio', 'presentation']
          && request.resource.data.name is string && request.resource.data.name.size() <= 200
          && request.resource.data.bytes is int && request.resource.data.bytes > 0 && request.resource.data.bytes <= 104857600
          && request.resource.data.chunks is int && request.resource.data.chunks > 0 && request.resource.data.chunks <= 120
          && request.resource.data.uploadedAt is string
          && request.resource.data.uploadedBy == request.auth.token.email;
        allow delete: if planner() || hasRole('av');
        match /chunks/{index} {
          allow get, list: if planner() || hasRole('av');
          allow create, update: if sender()
            && index.matches('^[0-9]{1,3}$')
            && !exists(/databases/$(database)/documents/deliveries/$(planId)/files/$(fileName))
            && request.resource.data.keys().hasOnly(['data'])
            && request.resource.data.data is bytes && request.resource.data.data.size() <= 921600;
          allow delete: if planner() || hasRole('av');
        }
      }
    }
    match /deliveryReceipts/{id} {
      allow read: if approved();
      allow create, update: if (admin() || hasRole('av'))
        && request.resource.data.keys().hasOnly(['id', 'hash', 'receivedAt', 'booth'])
        && request.resource.data.keys().hasAll(['id', 'hash', 'receivedAt', 'booth'])
        && request.resource.data.id == id
        && request.resource.data.hash is string && request.resource.data.hash.matches('^[0-9a-f]{64}$')
        && request.resource.data.receivedAt is string
        && request.resource.data.booth == request.auth.token.email;
      allow delete: if admin();
    }
    match /songs/{id} {
      allow read: if admin() || hasRole('planner') || hasRole('preacher') || hasRole('worship_leader') || hasRole('av') || hasRole('musician');
      allow create, update: if (admin() || hasRole('planner') || hasRole('worship_leader')) && validRecord(id);
      allow delete: if admin() || hasRole('planner') || hasRole('worship_leader');
    }
    match /plans/{planId}/sermons/{itemId} {
      function planner() { return admin() || hasRole('planner') || hasRole('worship_leader'); }
      function assigned() {
        return hasRole('preacher')
          && get(/databases/$(database)/documents/plans/$(planId)).data.sermonAssignments[itemId] == request.auth.token.email;
      }
      allow get: if planner() || hasRole('av') || assigned();
      allow list: if planner() || hasRole('av');
      allow create, update: if (planner() || assigned())
        && request.resource.data.keys().hasOnly(['id','planId','title','notes','slides','media','updatedAt'])
        && request.resource.data.id == itemId && request.resource.data.planId == planId
        && request.resource.data.title is string && request.resource.data.title.size() <= 200
        && request.resource.data.notes is string && request.resource.data.notes.size() <= 300000
        && request.resource.data.slides is list && request.resource.data.slides.size() <= 100
        && request.resource.data.media is list && request.resource.data.media.size() <= 30
        && request.resource.data.updatedAt is string;
      allow delete: if planner();
    }
    match /members/{id} {
      allow read: if admin() || hasRole('people');
      allow create, update: if (admin() || hasRole('people')) && validRecord(id);
      allow delete: if admin() || hasRole('people');
    }
    match /checkins/{id} {
      allow read: if admin() || hasRole('kids');
      allow create, update: if (admin() || hasRole('kids')) && validRecord(id);
      allow delete: if admin() || hasRole('kids');
    }
    match /groups/{id} {
      allow read: if admin() || hasRole('member');
      allow create, update: if admin() && validRecord(id);
      allow delete: if admin();
    }
    match /bookings/{id} {
      allow read: if admin() || hasRole('member');
      allow create, update: if admin() && validRecord(id);
      allow delete: if admin();
    }
    match /donations/{id} {
      allow read: if admin() || hasRole('finance');
      allow create, update: if (admin() || hasRole('finance')) && validRecord(id);
      allow delete: if admin() || hasRole('finance');
    }
  }
}`;
}
