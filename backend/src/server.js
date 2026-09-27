require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const { verifyToken } = require("./lib/auth");
const { setIo } = require("./realtime/io");
const { migrate } = require("./db/migrate");

const authRoutes = require("./routes/auth");
const contactsRoutes = require("./routes/contacts");
const pipelineRoutes = require("./routes/pipeline");
const fieldCapturesRoutes = require("./routes/fieldCaptures");
const inboxRoutes = require("./routes/inbox");
const remindersRoutes = require("./routes/reminders");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/auth", authRoutes);
app.use("/contacts", contactsRoutes);
app.use("/pipeline", pipelineRoutes);
app.use("/field-captures", fieldCapturesRoutes);
app.use("/inbox", inboxRoutes);
app.use("/reminders", remindersRoutes);

// Centralized so a route's thrown error becomes a clean 500 instead of an
// unhandled-rejection crash - a stray null contact_id etc. shouldn't take
// the whole service down.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// One instance, no Redis adapter - per the plan, Redis only gets added
// the day a second Node instance actually exists.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));
    socket.user = verifyToken(token);
    next();
  } catch (e) {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  socket.join(`org:${socket.user.org_id}`);
  socket.join(`user:${socket.user.sub}`);
});

setIo(io);

const PORT = process.env.PORT || 4100;

async function start() {
  await migrate();
  server.listen(PORT, () => console.log(`soulvai-sales backend listening on :${PORT}`));
}

if (require.main === module) {
  start().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}

module.exports = { app, server, start };
