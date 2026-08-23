# Gmail app password

Not needed until Phase 6. Leave `MAIL_*` blank; the app sandboxes mail.

1. Turn on 2-Step Verification on the Google account that will own the inbox.
2. [App Passwords](https://myaccount.google.com/apppasswords) → app “Mail”, device “Other” (Northstar).
3. Paste the 16 characters into `MAIL_PASSWORD`. Username is the full email.
4. Restart the API (and worker, when Compose exists).
5. Admin → Settings → mailbox status flips from “sandbox” to “connected” after the first successful handshake.

Workspace accounts may need the admin to allow app passwords.
See DESIGN.md Appendix E.
