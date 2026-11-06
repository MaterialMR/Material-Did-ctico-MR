 
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";

export default function RegistroPage() {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [institucion, setInstitucion] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);

  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [registroExitoso, setRegistroExitoso] = useState(false);

  async function registrarCliente(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMensaje("");
    setError("");

    if (!aceptaPrivacidad) {
      setError("Debes aceptar la política de privacidad.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    try {
      const { data, error: registroError } =
        await supabase.auth.signUp({
          email: correo.trim().toLowerCase(),
          password,
          options: {
            data: {
              full_name: nombre.trim(),
              phone: telefono.trim(),
              institution: institucion.trim(),
              privacy_policy_accepted: true,
            },
          },
        });

      if (registroError) {
        if (
          registroError.message.toLowerCase().includes("already registered")
        ) {
          setError("Este correo electrónico ya tiene una cuenta registrada.");
        } else {
          setError(registroError.message);
        }
        return;
      }

      if (data.user) {
        setRegistroExitoso(true);

        if (data.session) {
          setMensaje(
            "Tu cuenta fue creada correctamente. Ya puedes ingresar a la tienda."
          );
        } else {
          setMensaje(
            "Tu registro fue recibido. Revisa tu correo electrónico y confirma tu cuenta para completar el proceso."
          );
        }

        setPassword("");
        setConfirmarPassword("");
      } else {
        setError(
          "No fue posible confirmar el registro. Inténtalo nuevamente."
        );
      }
    } catch (err) {
      console.error("Error inesperado en el registro:", err);
      setError(
        "Ocurrió un problema de conexión. Comprueba tu internet e inténtalo nuevamente."
      );
    } finally {
      setCargando(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 15px",
    border: "1px solid #e5d5ff",
    borderRadius: "12px",
    marginTop: "7px",
    fontSize: "14px",
    boxSizing: "border-box",
    outlineColor: "#7e22ce",
    background: "#ffffff",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginTop: "17px",
    fontSize: "13px",
    fontWeight: "bold",
    color: "#32105e",
  };

  return (
    <main
      className="min-h-screen"
      style={{
        background: "#fff8fc",
        padding: "35px 16px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: "600px" }}>

        <header
          style={{
            background: "#ffffff",
            border: "1px solid #f0ddff",
            borderRadius: "24px",
            padding: "28px",
            textAlign: "center",
            marginBottom: "20px",
            boxShadow: "0 2px 5px rgba(50,16,94,0.05)",
          }}
        >
          <Link href="/">
            <img
              src="/logo/logo-material-didactico-mr.png"
              alt="Material Didáctico MR"
              style={{
                width: "95px",
                height: "95px",
                objectFit: "contain",
                margin: "0 auto 12px",
              }}
            />
          </Link>

          <p
            style={{
              color: "#ec1685",
              fontSize: "11px",
              fontWeight: "900",
              letterSpacing: "3px",
            }}
          >
            TIENDA EDUCATIVA
          </p>

          <h1
            style={{
              fontSize: "29px",
              fontWeight: "900",
              color: "#32105e",
              marginTop: "8px",
            }}
          >
            Crear mi cuenta
          </h1>

          <p
            style={{
              color: "#64748b",
              fontSize: "14px",
              marginTop: "8px",
            }}
          >
            Bienvenido a Material Didáctico MR
          </p>
        </header>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #f0ddff",
            borderRadius: "24px",
            padding: "28px",
            boxShadow: "0 3px 8px rgba(50,16,94,0.05)",
          }}
        >
          {error && (
            <div
              role="alert"
              style={{
                background: "#fff1f2",
                border: "1px solid #fecdd3",
                color: "#be123c",
                padding: "13px",
                borderRadius: "12px",
                marginBottom: "18px",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}

          {registroExitoso ? (
            <div
              role="status"
              style={{
                background: "#ecfdf5",
                border: "1px solid #a7f3d0",
                color: "#065f46",
                padding: "22px",
                borderRadius: "16px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "42px" }}>✓</div>

              <h2 style={{ fontWeight: "900", fontSize: "20px" }}>
                ¡Registro realizado!
              </h2>

              <p
                style={{
                  fontSize: "14px",
                  lineHeight: "1.7",
                  marginTop: "10px",
                }}
              >
                {mensaje}
              </p>

              <Link
                href="/iniciar-sesion"
                style={{
                  display: "inline-block",
                  marginTop: "20px",
                  background: "#7200d8",
                  color: "#ffffff",
                  padding: "13px 24px",
                  borderRadius: "30px",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              >
                Iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <h2
                style={{
                  fontSize: "19px",
                  fontWeight: "900",
                  color: "#32105e",
                  marginBottom: "5px",
                }}
              >
                Datos de registro
              </h2>

              <p style={{ color: "#64748b", fontSize: "13px" }}>
                Completa los siguientes campos para crear tu cuenta.
              </p>

              <form onSubmit={registrarCliente}>
                <label style={labelStyle}>
                  Nombre completo *
                  <input
                    style={inputStyle}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    maxLength={150}
                    autoComplete="name"
                    placeholder="Nombre y apellidos"
                  />
                </label>

                <label style={labelStyle}>
                  Correo electrónico *
                  <input
                    style={inputStyle}
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="correo@ejemplo.com"
                  />
                </label>

                <label style={labelStyle}>
                  Número de teléfono *
                  <input
                    style={inputStyle}
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    required
                    maxLength={30}
                    autoComplete="tel"
                    placeholder="Ejemplo: 8888-8888"
                  />
                </label>

                <label style={labelStyle}>
                  Institución educativa *
                  <input
                    style={inputStyle}
                    value={institucion}
                    onChange={(e) => setInstitucion(e.target.value)}
                    required
                    maxLength={150}
                    autoComplete="organization"
                    placeholder="Nombre de la institución"
                  />
                </label>

                <div
                  style={{
                    borderTop: "1px solid #f0ddff",
                    marginTop: "25px",
                    paddingTop: "20px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "17px",
                      fontWeight: "900",
                      color: "#32105e",
                    }}
                  >
                    Seguridad de tu cuenta
                  </h3>

                  <label style={labelStyle}>
                    Contraseña *
                    <input
                      style={inputStyle}
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                    />
                  </label>

                  <label style={labelStyle}>
                    Confirmar contraseña *
                    <input
                      style={inputStyle}
                      type="password"
                      value={confirmarPassword}
                      onChange={(e) =>
                        setConfirmarPassword(e.target.value)
                      }
                      required
                      minLength={8}
                      autoComplete="new-password"
                      placeholder="Escribe nuevamente tu contraseña"
                    />
                  </label>
                </div>

                <div
                  style={{
                    marginTop: "23px",
                    padding: "17px",
                    background: "#faf5ff",
                    border: "1px solid #ead5ff",
                    borderRadius: "15px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      gap: "11px",
                      alignItems: "flex-start",
                      fontSize: "13px",
                      lineHeight: "1.7",
                      color: "#334155",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={aceptaPrivacidad}
                      onChange={(e) =>
                        setAceptaPrivacidad(e.target.checked)
                      }
                      required
                      style={{
                        width: "19px",
                        height: "19px",
                        marginTop: "3px",
                        flexShrink: 0,
                        accentColor: "#7200d8",
                      }}
                    />

                    <span>
                      He leído y acepto la{" "}
                      <Link
                        href="/privacidad"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#7200d8",
                          fontWeight: "900",
                          textDecoration: "underline",
                        }}
                      >
                        Política de Privacidad y Protección de Datos
                      </Link>
                      . Autorizo el tratamiento de los datos indicados para
                      gestionar mi cuenta y mis pedidos. *
                    </span>
                  </label>

                  <p
                    style={{
                      fontSize: "11px",
                      color: "#64748b",
                      marginTop: "10px",
                    }}
                  >
                    La aceptación es obligatoria para crear una cuenta.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={cargando || !aceptaPrivacidad}
                  style={{
                    width: "100%",
                    padding: "15px",
                    marginTop: "23px",
                    border: "none",
                    borderRadius: "30px",
                    background:
                      cargando || !aceptaPrivacidad
                        ? "#c4b5d5"
                        : "#7200d8",
                    color: "#ffffff",
                    fontWeight: "900",
                    fontSize: "15px",
                    cursor:
                      cargando || !aceptaPrivacidad
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {cargando ? "Creando cuenta..." : "Crear mi cuenta"}
                </button>
              </form>
            </>
          )}

          <div
            style={{
              borderTop: "1px solid #f0ddff",
              marginTop: "25px",
              paddingTop: "20px",
              textAlign: "center",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            ¿Ya tienes una cuenta?{" "}
            <Link
              href="/iniciar-sesion"
              style={{
                color: "#7200d8",
                fontWeight: "900",
                textDecoration: "underline",
              }}
            >
              Iniciar sesión
            </Link>
          </div>

          <div style={{ textAlign: "center", marginTop: "17px" }}>
            <Link
              href="/"
              style={{
                color: "#64748b",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            >
              ← Volver a la tienda
            </Link>
          </div>
        </section>

        <footer
          style={{
            textAlign: "center",
            padding: "25px 10px",
            fontSize: "11px",
            color: "#94a3b8",
          }}
        >
          © 2027 Material Didáctico MR. Todos los derechos reservados.
        </footer>
      </div>
    </main>
  );
}
