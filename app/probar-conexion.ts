 import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function probarConexion() {
  const { supabase } = await import("./lib/supabase");

  const { data, error } = await supabase
    .from("categories")
    .select("name, slug")
    .order("name");

  if (error) {
    console.error("Error de conexión:", error.message);
    return;
  }

  console.log("¡Conexión exitosa!");
  console.table(data);
}

probarConexion();