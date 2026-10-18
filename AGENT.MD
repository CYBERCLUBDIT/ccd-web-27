# Cyber Club DIT implementation rules

Use Next.js 16 App Router, TypeScript, PostgreSQL, Tailwind, shadcn/ui, and Motion. Read bundled Next.js documentation before changing framework APIs.

All real membership, authentication, content, contact messages, and attendance belong in PostgreSQL. Do not add sample members, events, news, testimonials, or fictional leader profiles. Show useful empty states when no content has been published. Stock photographs are decorative and must not be represented as actual club event photographs.

Authenticate on the server using salted password hashes and opaque HTTP-only session cookies. Every protected server request must verify membership approval and role against PostgreSQL. Never trust role, approval, or identity supplied by a browser. Keep credentials and one-time setup tokens in ignored local files. Only theme preference may use localStorage.

Keep Space Grotesk titles and Figtree body text, responsive dark/light themes, a permanently dark footer, and reduced-motion support. Maintain the club’s blue identity.

Run npm run build and npm test for backend changes. Tests may create temporary uniquely named records and must clean them up. Preserve user-provided real records.
