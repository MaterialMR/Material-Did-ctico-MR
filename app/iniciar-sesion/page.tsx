
"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function IniciarSesionPage() {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function iniciarSesion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setCargando(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: correo.trim(),
      password,
    });

    setCargando(false);

    if (loginError) {
      setError(
        "No fue posible iniciar sesión. Verifica tu correo y contraseña."
      );
      return;
    }

    window.location.href = "/";
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    marginTop: "6px",
    fontSize: "15px",
    boxSizing: "border-box",
  };

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f8fafc",
      padding: "35px 16px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}>
      <section style={{
        width: "100%",
        maxWidth: "440px",
        background: "#ffffff",
        padding: "30px",
        borderRadius: "16px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.07)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <h1 style={{
            fontSize: "27px",
            fontWeight: "bold",
            color: "#263b63",
            marginBottom: "8px",
          }}>
            Bienvenido
          </h1>
          <p style={{ color: "#64748b", fontSize: "14px" }}>
            Tienda Material Didáctico MR
          </p>
        </div>

        <form onSubmit={iniciarSesion}>
          <label>Correo electrónico</label>
          <input
            style={inputStyle}
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            autoComplete="email"
            placeholder="correo@ejemplo.com"
          />

          <label style={{ display: "block", marginTop: "18px" }}>
            Contraseña
          </label>
          <input
            style={inputStyle}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Escribe tu contraseña"
          />

          {error && (
            <p style={{
              color: "#b91c1c",
              background: "#fef2f2",
              padding: "12px",
              borderRadius: "8px",
              marginTop: "18px",
              fontSize: "14px",
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={cargando}
            style={{
              width: "100%",
              padding: "14px",
              marginTop: "24px",
              border: "none",
              borderRadius: "8px",
              background: cargando ? "#94a3b8" : "#263b63",
              color: "#ffffff",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: cargando ? "not-allowed" : "pointer",
            }}
          >
            {cargando ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>

        <p style={{
          textAlign: "center",
          marginTop: "22px",
          fontSize: "14px",
          color: "#64748b",
        }}>
          ¿Todavía no tienes una cuenta?
        </p>

        <Link
          href="/registro"
          style={{
            display: "block",
            textAlign: "center",
            color: "#2563eb",
            fontWeight: "bold",
            fontSize: "14px",
            marginTop: "10px",
          }}
        >
          Crear mi cuenta
        </Link>

        <p style={{
          textAlign: "center",
          marginTop: "22px",
          fontSize: "14px",
        }}>
          <Link href="/" style={{ color: "#2563eb" }}>
            Volver a la tienda
          </Link>
        </p>
      </section>
    </main>
  );
}
