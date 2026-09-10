# Bloop

## Bloop logo assets
- `public/assets/bloop-icon.jpg` — favicon, Apple Home Screen icon, compact app branding.
- `public/assets/bloop-wordmark.jpg` — supplied Bloop wordmark artwork for larger branding placements.
- To replace either logo later, keep the same filenames and deploy again.

## Synchronized contact removal
Removing a contact now changes the chat state for both people instead of only deleting the local browser entry. The other person sees that the chat was removed and can still send a reach-out message. The person who removed it can read incoming messages and choose **Restore chat** or **Delete anyway**. Permanent deletion removes the room for both people.

## v25 Home alerts, live status, and chat code
- Home plays the incoming-message ting and shows an in-app popup when unread counts increase.
- Home contact cards show typing, recording audio, taking a photo, blurred/emergency, online, and last-seen states.
- The chat header displays the Bloop join code with a Copy button; existing rooms receive a code automatically.

## v26 Message replies
- Reply to text, photo, and voice messages.
- Reply preview appears above the composer and can be cancelled.
- Sent replies show the referenced message and can be tapped to jump back to it.
- Reply relationships are stored in SQLite using `reply_to_id`.
