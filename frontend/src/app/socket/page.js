"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSocket } from "@/hooks/useSocket";

export default function SocketPage() {
  const { socket, isConnected } = useSocket();
  const [respuestasPing, setRespuestasPing] = useState([]);
  const [contador, setContador] = useState(0);


  useEffect(() => {
    if (!socket) return;

    const handlePingAllRecibido = (data) => {
      setRespuestasPing((prev) => [...prev, data]);
    };

    const handleRespuestaPersonalizada = (data) => {
      setContador(data.contador);
    };

    socket.on("pingAll", handlePingAllRecibido);
    socket.on("respuestaPersonalizada", handleRespuestaPersonalizada);

    return () => {
      socket.off("pingAll", handlePingAllRecibido);
      socket.off("respuestaPersonalizada", handleRespuestaPersonalizada);
    };
  }, [socket]);

  const handlePingAll = () => {
    if (!socket) return;
    socket.emit("pingAll", { mensaje: "Ping desde /socket" });
  };

  const handleIncrementar = () => {
    if (!socket) return;
    socket.emit("eventoPersonalizado");
  };

  return (
    <div>
      <h1>Prueba de sockets</h1>

      <p>Estado de conexión: {isConnected ? "Conectado" : "Desconectado"}</p>

      <section>
        <h2>Ping a todos los clientes</h2>
        <button onClick={handlePingAll} disabled={!isConnected}>
          Hacer pingAll
        </button>

        {respuestasPing.length === 0 && <p>Todavía no hay respuestas.</p>}

        {respuestasPing.length > 0 && (
          <ul>
            {respuestasPing.map((r, index) => (
              <li key={index}>{JSON.stringify(r)}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Contador (eventoPersonalizado)</h2>
        <p>Valor actual: {contador}</p>
        <button onClick={handleIncrementar} disabled={!isConnected}>
          Incrementar
        </button>
      </section>

      <p>
        <Link href="/">Volver al inicio</Link>
      </p>
    </div>
  );
}