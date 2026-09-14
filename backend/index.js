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

//-----------------------------------------------------------------------------------------------------------------------------------
app.get("/usuarioWP", async function (req, res) {
  try {
    let respuesta = await realizarQuery("SELECT * FROM usuarioWP;");
    res.send({ usuarios: respuesta });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

app.post("/api/login", async function (req, res) {
  const { mail, contrasenia } = req.body;

  if (!mail || !contrasenia) {
    return res.status(400).send({
      error: "DATOS_INCOMPLETOS",
      mensaje: "Debes enviar email y contraseña.",
    });
  }

  try {
    const buscarUsuario = await realizarQuery(
      "SELECT * FROM usuarioWP WHERE mail = ?",
      [mail]
    );

    if (buscarUsuario.length === 0) {
      return res.status(404).send({
        error: "USUARIO_NO_EXISTE",
        mensaje: "El usuario no existe. ¡Debes registrarte!",
      });
    }

    const usuarioValido = buscarUsuario[0];
    let passwordCorrecta;

    if (usuarioValido.password.startsWith("$2")) {
      passwordCorrecta = await bcrypt.compare(
        contrasenia,
        usuarioValido.password
      );
    } else {
      passwordCorrecta = usuarioValido.contrasenia === contrasenia;
      if (passwordCorrecta) {
        try {
          const nuevoHash = await bcrypt.hash(contrasenia, 10);
          await realizarQuery(
            "UPDATE usuarioWP SET contrasenia = ? WHERE idUsuario = ?",
            [nuevoHash, usuarioValido.idUsuario]
          );
        } catch (migrationError) {
          console.log(
            "No se pudo migrar el password a hash:",
            migrationError.message
          );
        }
      }
    }

    if (passwordCorrecta) {
      res.send({
        loginExitoso: true,
        mensaje: "¡Ingreso exitoso!",
        usuario: {
          idUsuario: usuarioValido.idUsuario,
          nombre: usuarioValido.nombre,
        },
      });
    } else {
      res.status(401).send({
        loginExitoso: false,
        error: "PASSWORD_INCORRECTA",
        mensaje: "La contraseña es incorrecta.",
      });
    }
  } catch (error) {
    res
      .status(500)
      .send({ mensaje: "Error en la base de datos", error: error.message });
  }
});

app.post("/api/registro", async function (req, res) {
  const { nombre, mail, contrasenia } = req.body;

  if (!nombre || !mail || !contrasenia) {
    return res.status(400).send({
      registroExitoso: false,
      mensaje: "Debes enviar nombre, email y contraeña.",
    });
  }

  try {
    const existente = await realizarQuery(
      "SELECT * FROM usuarioWP WHERE mail = ?",
      [mail]
    );

    if (existente.length > 0) {
      return res.status(409).send({
        registroExitoso: false,
        mensaje: "Este correo ya está registrado",
      });
    }

    const maxIdResult = await realizarQuery(
      "SELECT MAX(idUsuario) as maxId FROM usuarioWP"
    );
    const nextId = (maxIdResult[0].maxId || 0) + 1;

    const passwordHasheada = await bcrypt.hash(contrasenia, 10);

    await realizarQuery(
      "INSERT INTO usuarioWP (idUsuario, nombre, mail, contrasenia, foto) VALUES (?, ?, ?, ?, ?)",
      [nextId, nombre, mail, passwordHasheada]
    );

    res.send({
      registroExitoso: true,
      mensaje: "Usuario creado con éxito. Ya puedes iniciar sesión.",
    });
  } catch (error) {
    res.status(500).send({
      registroExitoso: false,
      mensaje: "No se pudo registrar el usuario",
      error: error.message,
    });
  }
});
