# Roles and privacy

The church owns its Firebase project and chooses who can use it. The Suite's generated Firestore rules enforce these permissions on the server. The interface also hides areas outside a user's role.

| Role | Records they can read | Records they can change |
| --- | --- | --- |
| Owner, admin | All church records and member profiles | All church records; each person edits their own profile |
| Planner | Services and songs | Services and songs |
| AV, musician | Services and songs | None |
| People | People directory, including pastoral notes | People directory |
| Kids | Child check-ins, pickup codes and medical notes | Child check-ins |
| Finance | Giving records | Giving records |
| Member | Groups and room bookings | None |

A person may have more than one role. They can sign in with Google or with an email address and password. Email accounts must verify the address before entering their own profile or requesting shared church access. A link to the church does not grant record access; the owner or an admin approves each request. A verified person may enter their own name, contact number and household details before that approval. Other members cannot read those profiles. After removal, the server rejects new reads and writes to shared church records. Previously downloaded files or records already displayed on a device cannot be withdrawn remotely.

The member-facing address book is not implemented yet. Do not widen the `member` role to read the staff People collection: it includes pastoral and safeguarding fields. A future address book needs separate opt-in contact fields and visibility choices.

Child pickup verification codes stay at the check-in desk. A public parent page uses a different pager reference. The Suite prepares the wording to copy into PraiseAV; it does not automatically show it on a screen. Staff must verify the private pickup code and the guardian before releasing a child.

Giving records are an internal ledger, not a payment system, tax return, or verified Gift Aid claim. The potential Gift Aid figures are estimates for the church's finance team to review against declarations and current HMRC rules. Exported CSV and backup JSON files contain personal data and are not encrypted.

The static website stores only the chosen Firebase project connection details in localStorage. Church records are in that church's Firestore project. The sample mode uses example data in memory. Older browser records remain readable for backup but are not uploaded automatically.
