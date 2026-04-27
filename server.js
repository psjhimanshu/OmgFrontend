const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // 🔍 FIND PARTNER
  socket.on("findPartner", () => {
    if (waitingUser) {
      const roomId = `room-${waitingUser.id}-${socket.id}`;

      socket.join(roomId);
      waitingUser.join(roomId);

      socket.roomId = roomId;
      waitingUser.roomId = roomId;

      socket.partner = waitingUser;
      waitingUser.partner = socket;

      io.to(roomId).emit("chatStart", { roomId });

      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit("waiting");
    }
  });

  // 💬 MESSAGE
  socket.on("sendMessage", ({ message }) => {
    if (socket.roomId) {
      socket.to(socket.roomId).emit("receiveMessage", {
        message,
      });
    }
  });

  // ⌨️ TYPING
  socket.on("typing", () => {
    if (socket.partner) {
      socket.partner.emit("typing");
    }
  });

  // ⏭️ NEXT (SKIP)
  socket.on("next", () => {
    const partner = socket.partner;

if (partner) {
  partner.emit("partnerDisconnected");
  partner.roomId = null;
  partner.partner = null;
}

    socket.leave(socket.roomId);
    socket.partner = null;
    socket.roomId = null;

    // Put current user back in queue
    if (waitingUser) {
      const roomId = `room-${waitingUser.id}-${socket.id}`;

      socket.join(roomId);
      waitingUser.join(roomId);

      socket.roomId = roomId;
      waitingUser.roomId = roomId;

      socket.partner = waitingUser;
      waitingUser.partner = socket;

      io.to(roomId).emit("chatStart", { roomId });

      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit("waiting");
    }
  });

  socket.on("stop", () => {
  const partner = socket.partner;

  if (partner) {
    partner.emit("partnerDisconnected");
    partner.partner = null;
    partner.roomId = null;
  }

  socket.leave(socket.roomId);
  socket.partner = null;
  socket.roomId = null;
});

  // ❌ DISCONNECT
  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);

    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }

    const partner = socket.partner;

  if (partner) {
    partner.emit("partnerDisconnected");
    partner.partner = null;
  }
  });
});

server.listen(5000, () => {
  console.log("Server running on port 5000");
});