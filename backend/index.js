const express = require("express");
const cors = require("cors");
const session = require("express-session");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 4000;
const pool = require("./modulos/mysql");

async function realizarQuery(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function obtenerSiguienteId(tabla, columna) {
  const resultado = await realizarQuery(`SELECT MAX(${columna}) as maxId FROM ${tabla}`);
  return (resultado[0].maxId || 0) + 1;
}

const ORIGENES_PERMITIDOS = ["http://localhost:3000", "http://localhost:3001"];

app.use(cors({ origin: ORIGENES_PERMITIDOS, credentials: true }));
app.use(express.json());

const sessionMiddleware = session({
  secret: "supersarasa",
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: "lax",
    secure: false, // poner en true si se sirve por https
  },
});
app.use(sessionMiddleware);

// Middleware simple para proteger rutas que requieren sesión activa
function requiereSesion(req, res, next) {
  if (!req.session.user) {
    return res.status(401).send({
      error: "NO_AUTENTICADO",
      mensaje: "Debes iniciar sesión.",
    });
  }
  next();
}

const server = app.listen(PORT, () => {
  console.log(`Servidor NodeJS corriendo en http://localhost:${PORT}/`);
});

const io = new Server(server, {
  cors: {
    origin: ORIGENES_PERMITIDOS,
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

  socket.on("sendMessage", async (data) => {
    const { message, idUsuario } = data;
    const idChat = req.session.room;

    try {
      const idMensaje = await obtenerSiguienteId("mensajes", "idMensaje");
      await realizarQuery(
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
    } catch (error) {
      console.log("Error al guardar el mensaje:", error.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnect");
  });
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

async function loginHandler(req, res) {
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
    const passwordCorrecta = usuarioValido.contrasenia === contrasenia;

    if (passwordCorrecta) {
      // Clave: guardamos el usuario en la sesión para que
      // /api/chats, /api/grupos, etc. sepan quién está logueado.
      req.session.user = {
        idUsuario: usuarioValido.idUsuario,
        nombre: usuarioValido.nombre,
      };

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
}

async function registroHandler(req, res) {
  const { nombre, mail, contrasenia } = req.body;

  if (!nombre || !mail || !contrasenia) {
    return res.status(400).send({
      registroExitoso: false,
      mensaje: "Debes enviar nombre, email y contraseña.",
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

    const nextId = await obtenerSiguienteId("usuarioWP", "idUsuario");

    await realizarQuery(
      "INSERT INTO usuarioWP (idUsuario, nombre, mail, contrasenia, foto) VALUES (?, ?, ?, ?, ?)",
      [nextId, nombre, mail, contrasenia, null]
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
}

// Rutas pedidas por la consigna
app.post("/login", loginHandler);
app.post("/register", registroHandler);

// Se mantienen los alias en español por compatibilidad con lo que ya existía
app.post("/api/login", loginHandler);
app.post("/api/registro", registroHandler);

//--------------------------------------------------------------------------------------------------------------

// Listado de chats del usuario logueado, incluyendo la foto del contacto
// (o la foto del grupo, si el chat es grupal)


app.get("/api/chats", requiereSesion, async function (req, res) {
  const idUsuario = req.session.user.idUsuario;

  try {
    const chats = await realizarQuery(
      `SELECT
         c.idChat,
         c.esGrupo,
         CASE WHEN c.esGrupo THEN c.nombre ELSE otro.nombre END AS nombre,
         CASE WHEN c.esGrupo THEN c.foto ELSE otro.foto END AS foto,
         otro.idUsuario AS idContacto
       FROM chats c
       JOIN chatXusuario cxu ON cxu.idChat = c.idChat AND cxu.idUsuario = ?
       LEFT JOIN chatXusuario cxu2
         ON cxu2.idChat = c.idChat AND cxu2.idUsuario <> ? AND c.esGrupo = FALSE
       LEFT JOIN usuarioWP otro ON otro.idUsuario = cxu2.idUsuario
       ORDER BY c.idChat DESC`,
      [idUsuario, idUsuario]
    );

    res.send({ chats });
  } catch (error) {
    res.status(500).send({ mensaje: "No se pudieron obtener los chats", error: error.message });
  }
});
app.post("/api/chats", requiereSesion, async function (req, res) {
  const { mail } = req.body;

  try {
    const otro = await realizarQuery("SELECT * FROM usuarioWP WHERE mail = ?", [mail]);

    if (otro.length === 0) {
      return res.status(404).send({
        error: "USUARIO_NO_EXISTE",
        mensaje: "El usuario no existe.",
      });
    }

    const idChat = await obtenerSiguienteId("chats", "idChat");
    await realizarQuery(
      "INSERT INTO chats (idChat, nombre, esGrupo, foto) VALUES (?, NULL, FALSE, NULL)",
      [idChat]
    );
    await realizarQuery(
      "INSERT INTO chatXusuario (idChat, idUsuario) VALUES (?, ?), (?, ?)",
      [idChat, req.session.user.idUsuario, idChat, otro[0].idUsuario]
    );

    res.send({ chatCreado: true, idChat });
  } catch (error) {
    res.status(500).send({ mensaje: "No se pudo crear el chat", error: error.message });
  }
});

app.post("/api/grupos", requiereSesion, async function (req, res) {
  const { nombre, foto, mails } = req.body;

  try {
    const idsUsuarios = [];
    for (const mail of mails) {
      const encontrado = await realizarQuery("SELECT * FROM usuarioWP WHERE mail = ?", [mail]);
      if (encontrado.length === 0) {
        return res.status(404).send({
          error: "USUARIO_NO_EXISTE",
          mensaje: `El usuario ${mail} no existe.`,
        });
      }
      idsUsuarios.push(encontrado[0].idUsuario);
    }

    const idChat = await obtenerSiguienteId("chats", "idChat");
    await realizarQuery(
      "INSERT INTO chats (idChat, nombre, esGrupo, foto) VALUES (?, ?, TRUE, ?)",
      [idChat, nombre, foto || null]
    );

    const idsTotal = [req.session.user.idUsuario, ...idsUsuarios];
    for (const idUsuario of idsTotal) {
      await realizarQuery("INSERT INTO chatXusuario (idChat, idUsuario) VALUES (?, ?)", [idChat, idUsuario]);
    }

    res.send({ grupoCreado: true, idChat });
  } catch (error) {
    res.status(500).send({ mensaje: "No se pudo crear el grupo", error: error.message });
  }
});

app.get("/api/mensajes/:idChat", requiereSesion, async function (req, res) {
  const { idChat } = req.params;

  try {
    const mensajes = await realizarQuery(
      `SELECT m.idMensaje, m.contenido, m.fecha, m.idUsuario, u.nombre
       FROM mensajes m JOIN usuarioWP u ON u.idUsuario = m.idUsuario
       WHERE m.idChat = ? ORDER BY m.fecha ASC`,
      [idChat]
    );
    res.send({ mensajes });
  } catch (error) {
    res.status(500).send({ mensaje: "No se pudieron obtener los mensajes", error: error.message });
  }
});