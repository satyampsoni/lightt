// In-memory state — shared within a warm serverless instance
let currentQuestion = null;
let votes = { red: 0, green: 0 };
let votingOpen = false;
let voters = new Set();
let sessionActive = false;

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  const action = req.query.action;

  // --- GET: Poll current state ---
  if (req.method === "GET" && action === "status") {
    const total = votes.red + votes.green;
    return res.json({
      question: currentQuestion,
      votes,
      total,
      votingOpen,
      sessionActive,
    });
  }

  // --- POST: Presenter sets a new question ---
  if (req.method === "POST" && action === "question") {
    currentQuestion = req.body.question || null;
    votes = { red: 0, green: 0 };
    voters = new Set();
    votingOpen = true;
    sessionActive = true;
    return res.json({ ok: true });
  }

  // --- POST: Audience submits a vote ---
  if (req.method === "POST" && action === "vote") {
    const { color, voterId } = req.body;
    if (!votingOpen) return res.json({ ok: false, reason: "closed" });
    if (!color || !["red", "green"].includes(color))
      return res.json({ ok: false, reason: "invalid" });
    if (voterId && voters.has(voterId))
      return res.json({ ok: false, reason: "already_voted" });
    if (voterId) voters.add(voterId);
    votes[color]++;
    return res.json({ ok: true });
  }

  // --- POST: Close voting ---
  if (req.method === "POST" && action === "close") {
    votingOpen = false;
    return res.json({ ok: true, votes });
  }

  // --- POST: Reset for next question ---
  if (req.method === "POST" && action === "reset") {
    currentQuestion = null;
    votes = { red: 0, green: 0 };
    voters = new Set();
    votingOpen = false;
    return res.json({ ok: true });
  }

  // --- POST: End session ---
  if (req.method === "POST" && action === "end") {
    currentQuestion = null;
    votes = { red: 0, green: 0 };
    voters = new Set();
    votingOpen = false;
    sessionActive = false;
    return res.json({ ok: true });
  }

  return res.status(404).json({ error: "unknown action" });
}
