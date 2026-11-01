// Each church installs these rules in its own Firebase project. A user owning
// the Google account named here can administer the church from a fresh project;
// every other person must be approved by an administrator in the Suite.
export function churchRules(ownerEmail: string): string {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) throw new Error('Enter a valid owner email first.');
  const owner = JSON.stringify(ownerEmail.trim().toLowerCase());
  return `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function owner() {
      return signedIn() && request.auth.token.email_verified == true
        && request.auth.token.email == ${owner};
    }
    function membership() {
      return get(/databases/$(database)/documents/memberships/$(request.auth.uid));
    }
    function hasRole(role) {
      return signedIn()
        && exists(/databases/$(database)/documents/memberships/$(request.auth.uid))
        && role in membership().data.roles;
    }
    function admin() { return owner() || hasRole('admin'); }
    function validRecord(id) { return request.resource.data.id == id; }

    match /memberships/{uid} {
      allow read: if admin() || (signedIn() && request.auth.uid == uid);
      allow create, update: if admin() && request.resource.data.uid == uid
        && request.resource.data.roles is list
        && request.resource.data.roles.hasOnly(['admin', 'planner', 'av', 'musician', 'people', 'kids', 'finance', 'member']);
      allow delete: if admin();
    }
    match /joinRequests/{uid} {
      allow read: if admin() || (signedIn() && request.auth.uid == uid);
      allow create, update: if signedIn() && request.auth.uid == uid
        && request.resource.data.uid == uid
        && request.resource.data.email == request.auth.token.email;
      allow delete: if admin();
    }
    match /plans/{id} {
      allow read: if admin() || hasRole('planner') || hasRole('av') || hasRole('musician');
      allow create, update: if (admin() || hasRole('planner')) && validRecord(id);
      allow delete: if admin() || hasRole('planner');
    }
    match /songs/{id} {
      allow read: if admin() || hasRole('planner') || hasRole('av') || hasRole('musician');
      allow create, update: if (admin() || hasRole('planner')) && validRecord(id);
      allow delete: if admin() || hasRole('planner');
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
