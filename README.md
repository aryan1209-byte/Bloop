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

## v30 cross-device invite handoff
- Removed the v29 top app/menu bar.
- Kept the small version badge and updated it to Bloop v30.
- Once the invited person accepts a chat, the original invite link can be opened on their iPad/laptop to resume the same guest chat.
- The original phone session stays valid; handoff does not replace its guest token.

## v31 Cross-device continuation
- The original invite link is only for accepting the chat. It is no longer a reusable cross-device login.
- Inside any chat, tap the ⇄ Link another device button to create a one-time 10-character device code.
- On another device, open the normal Bloop home page and use Continue a chat from another device.
- The code expires after 10 minutes and works once.
- Redeeming the code creates a separate access token, so both the phone and the iPad can stay signed in to the same chat.

## v32 phone UI + profile fixes
- Rebuilt the narrow-phone chat layout so header identity, presence/last-seen, controls, code, messages, voice notes, and composer no longer overlap.
- Floating message actions are hidden on phones; swipe-to-reply and long-press reactions remain, with Delete available in the long-press menu for your own messages.
- Added editable Name and Username fields in Customize/Profile and sync them across locally saved chats.
- Disabled the automatic per-chat theme/customization popup. Theme changes are manual from Customize.
- Added explicit background/foreground presence events so last-seen updates when the app is hidden and online returns when it is visible.
- Version badge moved above the phone composer while a chat is open.

## v33 Quick code + cross-device return
- For a brand-new chat, the fastest option is the existing 8-character Bloop code. Send only that short code; the other person opens the normal Bloop homepage on any device and uses Quick Join. No long invite URL is required.
- For a chat that was already accepted on another device, each participant can set a 4-digit Device PIN in Profile & Appearance.
- On another device, use Continue an existing chat with the same 8-character chat code + that 4-digit PIN.
- Continuing creates a separate access token, so both devices can remain signed in.
- The original invite URL is not reused as a cross-device login after the chat has already been accepted.
test

## v34 Quick codes + People
- New chats get a 4-digit quick code, and the creator can change it to any available 4-digit code.
- Home now has Chats and People tabs.
- People supports username search, friend requests, accepting/declining, and messaging accepted friends.
- Messaging a friend creates or reopens a normal Bloop chat.
