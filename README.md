# MyNotes

A Next.js notes app with Firebase Authentication and live Cloud Firestore sync.

## Firebase setup

1. In the [Firebase console](https://console.firebase.google.com/), create or select your project and register a Web app.
2. Copy `.env.example` to `.env.local` and fill in the Web app configuration from **Project settings → General**. If `.env.local` already exists, keep its values.
3. Under **Authentication → Sign-in method**, enable **Email/Password** and optionally **Google**. Under **Authentication → Settings → Authorized domains**, add `localhost` for local development and the hostname used for your deployed app.
4. Create a **Cloud Firestore** database using the `(default)` database ID. Publish the contents of `firestore.rules` in its **Rules** tab. Alternatively, with the Firebase CLI authenticated, deploy just these rules:

   ```sh
   npx firebase-tools deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```

   These rules restrict notes to their owner and prevent changing ownership. They permit authenticated reads of nonexistent documents so the import transaction can safely create a new note. Rules for other collections remain denied. Review existing rules before replacing them if this Firebase project also serves other applications.

5. Run `npm install` and `npm run dev`. Open [localhost:3000](http://localhost:3000).
6. Click **Sign in to sync**. Sign in with the same Firebase account on every device.
7. If this browser already has local notes, click **Upload N local notes** after signing in. This copies them into the displayed account and keeps the original local backup. Import IDs are deterministic and transactions prevent retries from overwriting an already imported note. Existing cloud notes are not replaced; legacy copies may appear as separate imported notes.

For use across devices, deploy the app to a reachable HTTPS address. Set the same `NEXT_PUBLIC_FIREBASE_*` variables in the hosting environment **before building**, then rebuild/redeploy. Next.js embeds these public Firebase settings into the browser bundle; never put an Admin SDK private key or service-account credential in them.

## Storage behavior

- Signed-in notes live in `notes/{noteId}`, with a `userId` matching Firebase Authentication. A live query loads only that account's notes, including changes and deletions from other devices.
- Guests can keep writing locally. The app clearly labels guest notes as device-only; signing in is required for cloud sync.
- Cloud status says **Saved to Firebase** only after server data is received and pending writes are acknowledged. A cached snapshot is not treated as proof of a cloud save.
- Firestore's browser persistence queues offline writes across reloads, where IndexedDB is available. Reconnect and wait for **Saved to Firebase** before expecting changes on another device. Importing requires an internet connection.
- Failed writes stay visible for retry, with recovery copies scoped to the signed-in account. Cloud errors never fall back to the shared guest notes. Sign-out waits for pending work to finish.
- Note fields are patched independently. Simultaneous edits to the same field use Firestore's last-write-wins behavior; this is not a collaborative text editor.
- The original `mynotes-data` local backup remains untouched by cloud syncing and import. Local backup content can remain on a shared device after sign-out.

If sync fails, check the displayed Firebase error. `permission-denied` usually means the rules have not been deployed to the configured project. Authentication errors may indicate a disabled provider or missing authorized domain. After correcting the setup, click **Retry sync**; use **Upload N local notes** again to retry an import.

Implementation references: [Firestore live listeners](https://firebase.google.com/docs/firestore/query-data/listen), [offline persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline), and [ownership rules](https://firebase.google.com/docs/firestore/security/rules-conditions).

## Verification

```sh
npm test
npx tsc --noEmit
npm run build
```

The automated provider tests mock Firebase and cover immediate edits after creation, live updates, account isolation, failed writes, metadata status, and retry-safe local import. They do not verify a live project's Authentication configuration or deployed rules. To verify that deployment, sign in on two devices, create/edit/pin/delete a note on one, and confirm the other updates without refreshing. A different account must not see those notes.
