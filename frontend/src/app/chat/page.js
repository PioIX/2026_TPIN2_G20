"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSocket } from "@/hooks/useSocket";

export default function ChatPage() {
  const { socket } = useSocket();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Leer sala y usuario desde la URL
  const sala = searchParams.get("sala");
  const usuario = searchParams.get("usuario");

  const [mensaje, setMensaje] = useState("");
  const [conversacion, setConversacion] = useState([]);
  const [nuevaSala, setNuevaSala] = useState("");

  // Al entrar (o cambiar de sala), unirse a la sala y escuchar mensajes nuevos
  useEffect(() => {
    if (!socket || !sala) return;

    socket.emit("joinRoom", { room: sala });

    // Vaciar la conversación anterior al cambiar de sala
    setConversacion([]);

    const handleNewMessage = (data) => {
      setConversacion((prev) => [...prev, data]);
    };

    socket.on("newMessage", handleNewMessage);

    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, sala]);

  // Enviar un mensaje a la sala actual
  const handleEnviar = () => {
    socket.emit("sendMessage", { message: mensaje });
    setMensaje("");
  };

  // Cambiar de sala sin acumular historial (router.replace)
  const handleCambiarSala = () => {
    router.replace(`/chat?sala=${nuevaSala}&usuario=${usuario}`);
    setNuevaSala("");
  };

  return (
    <div>
      <h1>Chat</h1>
      <p>
        Usuario: {usuario} — Sala: {sala}
      </p>

      <div>
        <input
          type="text"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
        />
        <button onClick={handleEnviar}>Enviar</button>
      </div>

      <h2>Conversación</h2>
      <ul>
        {conversacion.map((m, index) => (
          <li key={index}>
            [{m.room}] {m.message}
          </li>
        ))}
      </ul>

      <h2>Cambiar de sala</h2>
      <input
        type="text"
        value={nuevaSala}
        onChange={(e) => setNuevaSala(e.target.value)}
      />
      <button onClick={handleCambiarSala}>Cambiar de sala</button>
    </div>
  );
}