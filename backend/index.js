const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 4000;
const pool = require("./modulos/mysql");

app.use(cors());
app.use(express.json());

const sessionMiddleware = session({
  secret: "supersarasa",
  resave: false,
  saveUninitialized: false,
});
app.use(sessionMiddleware);

const server = app.listen(PORT, () => {
  console.log(`Servidor NodeJS corriendo en http://localhost:${PORT}/`);
});

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

io.use((socket, next) => {
  sessionMiddleware(socket.request, {}, next);
});

io.on("connection", (socket) => {
  const req = socket.request;

  socket.on("joinRoom", (data) => {
    if (req.session.room != undefined && req.session.room.length > 0) {
      socket.leave(req.session.room);
    }
    req.session.room = data.room;
    socket.join(req.session.room);
  });
});

socket.on("sendMessage", async (data) => {
  const { message, idUsuario } = data;
  const idChat = req.session.room;

  const idMensaje = await siguienteId("mensajes", "idMensaje");
  await pool.query(
    "INSERT INTO mensajes (idMensaje, idChat, idUsuario, contenido, fecha) VALUES (?, ?, ?, ?, NOW())",
    [idMensaje, idChat, idUsuario, message]
  );

  io.to(idChat).emit("newMessage", {
    idMensaje,
    idChat,
    idUsuario,
    contenido: message,
    fecha: new Date(),
  });
});

socket.on("disconnect", () => {
  console.log("Disconnect");
});
