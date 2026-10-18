# PostgreSQL validation

The application no longer uses browser-local membership, profile, event, or authentication state. Only the display theme uses localStorage.

`npm test` exercises real PostgreSQL writes through HTTP routes: server validation, duplicate registration, pending login rejection, same-origin checks, administrator approval, password verification, session cookies, member/admin authorization, content publication, booking, attendance, unpublishing, approval revocation, and logout. Temporary test accounts and content are removed using their exact IDs and unique emails.

The production build verifies all server and client components. The initial administrator must use the private setup link in `.local/admin-setup.txt` to choose a password. SMTP is not configured; recovery links can be issued using the documented local script.
