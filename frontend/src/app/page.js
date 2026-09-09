"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const [usuario, setUsuario] = useState("");
  const [sala, setSala] = useState("");
  const router = useRouter();

  const handleEntrar = () => {
    router.push(`/chat?sala=${sala}&usuario=${usuario}`);
  };

  return (
    <div>
      <h1>Bienvenido</h1>

      <div>
        <label>Usuario: </label>
        <input
          type="text"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
      </div>

      <div>
        <label>Sala: </label>
        <input
          type="text"
          value={sala}
          onChange={(e) => setSala(e.target.value)}
        />
      </div>

      <button onClick={handleEntrar} disabled={!usuario && !sala ? true : !usuario || !sala}>
        Entrar al chat
      </button>

      {(!usuario || !sala) && (
        <p>Completá usuario y sala para poder entrar.</p>
      )}

      <p>
        <Link href="/socket">Ir a la página de prueba de sockets</Link>
      </p>
    </div>
  );
}