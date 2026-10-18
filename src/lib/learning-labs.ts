export const learningLabs = [
  {
    id: "phishing",
    title: "Spot the phishing email",
    category: "Digital safety",
    level: "Beginner",
    minutes: 15,
    description:
      "Look past the logo. Learn to recognise the small clues in a suspicious message.",
    objective: "Decide whether an email is safe before opening a link.",
    steps: [
      "Read the sender address carefully.",
      "Compare the sender domain with the organisation named in the message.",
      "Look for urgency, unusual requests, or a link that does not match the sender.",
    ],
    evidence:
      "From: IT Support <help@campus-login.example>\nSubject: URGENT: your account closes in 10 minutes\n\nEnter your password at https://verify-access.example to keep your account.",
    question: "What is the safest next step?",
    choices: [
      "Open the link and enter the password",
      "Contact IT through a known official channel",
      "Forward the message to everyone",
    ],
    correct: 1,
    explanation:
      "Verify the request through a contact you already trust. Urgency and an unfamiliar login domain are warning signs.",
  },
  {
    id: "http-headers",
    title: "Read the response",
    category: "Web security",
    level: "Beginner",
    minutes: 20,
    description:
      "Explore the HTTP headers that help browsers protect people and their data.",
    objective:
      "Find the header that prevents a page from being embedded in another site.",
    steps: [
      "Read the example HTTP response.",
      "Separate transport settings from browser security settings.",
      "Identify the protection against unwanted framing.",
    ],
    evidence:
      "HTTP/2 200\nContent-Type: text/html\nX-Content-Type-Options: nosniff\nContent-Security-Policy: frame-ancestors 'none'\nCache-Control: no-store",
    question: "Which setting stops other sites embedding this page?",
    choices: [
      "Content-Type: text/html",
      "Cache-Control: no-store",
      "frame-ancestors 'none'",
    ],
    correct: 2,
    explanation:
      "The frame-ancestors directive controls which pages may embed this page. The value 'none' allows none.",
  },
  {
    id: "network-map",
    title: "Follow the connection",
    category: "Networks",
    level: "Beginner",
    minutes: 25,
    description:
      "Trace a browser request from a device to a service, one connection at a time.",
    objective:
      "Recognise the difference between a device address and a service port.",
    steps: [
      "Identify the source and destination addresses.",
      "Locate the destination service port.",
      "Use the protocol label to interpret the encrypted web connection.",
    ],
    evidence:
      "Source:      192.0.2.10:51824\nDestination: 198.51.100.20:443\nProtocol:    TCP / TLS\nService:     HTTPS",
    question: "Which number identifies the destination HTTPS service?",
    choices: ["443", "51824", "192.0.2.10"],
    correct: 0,
    explanation:
      "443 is the destination service port. 51824 is the client's temporary source port; 192.0.2.10 is an example device address.",
  },
  {
    id: "log-investigation",
    title: "A story in the logs",
    category: "Forensics",
    level: "Intermediate",
    minutes: 30,
    description:
      "Piece together a short timeline and choose the evidence that deserves attention.",
    objective:
      "Identify a suspicious sequence without assuming that every failed login is an attack.",
    steps: [
      "Arrange the events by timestamp.",
      "Compare successful and failed attempts from the same source.",
      "Choose the sequence to investigate and preserve the original logs.",
    ],
    evidence:
      "09:00 user=alex source=192.0.2.4 result=failed\n09:01 user=alex source=192.0.2.4 result=failed\n09:02 user=alex source=192.0.2.4 result=success\n09:03 user=alex action=export_members\n09:10 user=sam result=success action=view_profile",
    question: "Which sequence needs closer investigation?",
    choices: [
      "Sam viewing a profile",
      "Failed logins followed by success and a data export",
      "Every successful login equally",
    ],
    correct: 1,
    explanation:
      "Repeated failures followed by a successful login and a data export warrant investigation. They are evidence to examine, not proof by themselves.",
  },
  {
    id: "access-control",
    title: "Who should see this?",
    category: "Web security",
    level: "Intermediate",
    minutes: 25,
    description:
      "Think through ownership checks and build a clear boundary around private records.",
    objective:
      "Choose an authorisation rule that checks who owns the requested record.",
    steps: [
      "Identify the signed-in user.",
      "Check the owner of the requested record on the server.",
      "Deny access unless ownership or a valid administrator permission is confirmed.",
    ],
    evidence:
      "Signed-in user: member-17\nRequested record: /applications/member-42\nRecord owner: member-42\nCurrent role: member",
    question: "What should the server do?",
    choices: [
      "Return the record because someone is signed in",
      "Hide the link but return the record",
      "Deny access because the user does not own it",
    ],
    correct: 2,
    explanation:
      "Authentication alone is not authorisation. The server must verify ownership or an explicit permission before returning private data.",
  },
  {
    id: "incident-triage",
    title: "The first ten minutes",
    category: "Incident response",
    level: "Advanced",
    minutes: 40,
    description:
      "Make a calm first decision when a security alert needs a coordinated response.",
    objective:
      "Balance containment, evidence preservation, and communication during an incident.",
    steps: [
      "Record the alert, affected system, and time.",
      "Preserve evidence and follow the organisation's incident plan.",
      "Notify the response lead and coordinate proportionate containment.",
    ],
    evidence:
      "Alert: unexpected outbound traffic\nAsset: a shared training server\nStatus: service is running\nEvidence: network logs and a recent process snapshot\nOwner: the training team",
    question: "Which is the best initial response?",
    choices: [
      "Document the alert, preserve evidence, and contact the response lead",
      "Delete all logs immediately",
      "Ignore the alert until the server stops",
    ],
    correct: 0,
    explanation:
      "Follow the incident plan: document, preserve evidence, and coordinate containment with the responsible team. Destructive actions can erase useful evidence.",
  },
] as const;
