# Roles and privacy

The church owns its Firebase project and chooses who can use it. The Suite's generated Firestore rules enforce these permissions on the server. The interface also hides areas outside a user's role.

| Role | Records they can read | Records they can change |
| --- | --- | --- |
| Owner, admin | All church records and member profiles | All church records; each person edits their own profile |
| Office staff | Service plans and opt-in member directory | Opens invitation email drafts; an administrator approves access and assigns roles |
| Planner | Services and songs | Services and songs |
| Preacher | Services and songs | None |
| Worship leader | Services and songs | Services and songs |
| AV, musician | Services and songs | None |
| People | People directory, including pastoral notes | People directory |
| Kids | Child check-ins, pickup codes and medical notes | Child check-ins |
| Finance | Giving records | Giving records |
| Member | Groups and room bookings | None |
| Family | Opt-in church directory | Own private profile and directory choices |

A person may have more than one role. They can sign in with Google or with an email address and password. Email accounts must verify the address before entering their own profile or requesting shared church access. A link to the church does not grant record access; the owner or an admin approves each request. A verified person may enter their own name, contact number and household details before that approval. Other members cannot read those profiles. After removal, the server rejects new reads and writes to shared church records. Previously downloaded files or records already displayed on a device cannot be withdrawn remotely.

All approved church users can see the **opt-in church directory**. It is stored in a separate `directoryListings` collection. A person's name appears only after they tick the optional sharing box and save. Household name, email and phone each have their own choices, off by default. Unchecking the main box removes the listing. Other family names, children's records, pastoral notes and safeguarding fields never enter the directory. Do not widen `member` or `family` to read the staff People collection.

The same role can be assigned to several people, including multiple preachers and rotating worship leaders. Office staff can prepare an invitation email in their own mail app; the Suite does not send it automatically. Only an owner or administrator approves requests or changes roles. An email invite is a link to request access, not an access grant.

Child pickup verification codes stay at the check-in desk. A public parent page uses a different pager reference. The Suite prepares the wording to copy into PraiseAV; it does not automatically show it on a screen. Staff must verify the private pickup code and the guardian before releasing a child.

Giving records are an internal ledger, not a payment system, tax return, or verified Gift Aid claim. The potential Gift Aid figures are estimates for the church's finance team to review against declarations and current HMRC rules. Exported CSV and backup JSON files contain personal data and are not encrypted.

The static website stores only the chosen Firebase project connection details in localStorage. Church records are in that church's Firestore project. The sample mode uses example data in memory. Older browser records remain readable for backup but are not uploaded automatically.
