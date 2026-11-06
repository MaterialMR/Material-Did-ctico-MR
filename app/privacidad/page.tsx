
export default function PrivacidadPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50 px-4 py-10 text-slate-800">
      <div className="mx-auto max-w-4xl">
        <a href="/" className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-5 py-2 text-sm font-bold text-purple-900 shadow-sm hover:bg-purple-50">
          ← Volver a la tienda
        </a>

        <article className="mt-6 rounded-3xl border border-purple-100 bg-white p-6 shadow-sm sm:p-10">
          <p className="text-sm font-bold uppercase tracking-wide text-purple-600">Tienda 100 % digital</p>
          <h1 className="mt-2 text-3xl font-black text-purple-950">Política de privacidad y protección de datos personales</h1>
          <p className="mt-3 text-sm text-slate-500">Material Didáctico MR · Costa Rica</p>

          <section className="mt-8 space-y-3">
            <h2 className="text-xl font-extrabold text-purple-900">1. Responsable</h2>
            <p>El responsable indicado para esta tienda y el tratamiento de los datos personales es <strong>Material Didáctico MR (marca registrada)</strong>, por medio de su representante legal indicado, <strong>Teacher Melissa Rosales R.</strong></p>
            <p>La tienda opera en modalidad 100 % digital. Su ubicación de referencia comercial es Daniel Flores, Pérez Zeledón, provincia de San José, Costa Rica. No se ofrece atención presencial en esa ubicación.</p>
          </section>

          <section className="mt-7 space-y-3">
            <h2 className="text-xl font-extrabold text-purple-900">2. Datos que podemos solicitar</h2>
            <ul className="list-disc space-y-1 pl-6">
              <li>Nombre completo.</li>
              <li>Número de teléfono.</li>
              <li>Correo electrónico.</li>
              <li>Institución educativa.</li>
            </ul>
            <p>Solicitaremos únicamente los datos básicos necesarios para identificar y mantener el registro del cliente y gestionar la adquisición de los materiales.</p>
          </section>

          <section className="mt-7 space-y-3">
            <h2 className="text-xl font-extrabold text-purple-900">3. Finalidad del tratamiento</h2>
            <p>Los datos se utilizarán para:</p>
            <ul className="list-disc space-y-1 pl-6">
              <li>Identificar y mantener un registro interno de clientes.</li>
              <li>Registrar los materiales adquiridos y conservar un historial de compras.</li>
              <li>Gestionar la confirmación de pedidos, pagos, entrega y acceso a materiales digitales.</li>
              <li>Brindar soporte relacionado con los productos adquiridos.</li>
              <li>Mantener controles razonables de seguridad y prevenir accesos o usos no autorizados de los materiales.</li>
            </ul>
            <p>El dato de institución educativa se conservará como referencia del registro del cliente. No se utilizará para contactar a dicha institución.</p>
          </section>

          <section className="mt-7 space-y-3">
            <h2 className="text-xl font-extrabold text-purple-900">4. Confidencialidad y comunicación a terceros</h2>
            <p>Material Didáctico MR tratará la información de forma confidencial y aplicará medidas razonables para protegerla contra pérdida, alteración, consulta o utilización no autorizada.</p>
            <p>Los datos no se venden ni se facilitan a terceros para que realicen publicidad propia. Algunos proveedores tecnológicos que permiten operar la tienda podrían procesar información únicamente en la medida necesaria para prestar servicios de alojamiento, almacenamiento, comunicación o gestión técnica, bajo las condiciones de protección y seguridad aplicables.</p>
            <p>El envío de promociones o publicidad no forma parte de las finalidades necesarias descritas en esta política y requerirá una autorización independiente cuando corresponda.</p>
          </section>

          <section className="mt-7 space-y-3">
            <h2 className="text-xl font-extrabold text-purple-900">5. Conservación y seguridad</h2>
            <p>Los datos se conservarán durante el tiempo necesario para gestionar la relación comercial, mantener el registro de compras y atender obligaciones legales o solicitudes relacionadas con los productos. Cuando dejen de ser necesarios, se eliminarán o dejarán de utilizarse, salvo que exista una razón legal para conservarlos.</p>
            <p>Se aplicarán medidas razonables de seguridad y acceso restringido. Ningún sistema de almacenamiento o transmisión por Internet puede garantizar seguridad absoluta.</p>
          </section>

          <section className="mt-7 space-y-3">
            <h2 className="text-xl font-extrabold text-purple-900">6. Derechos de las personas titulares</h2>
            <p>La persona titular puede solicitar información sobre sus datos y ejercer los derechos que reconoce la legislación costarricense, incluyendo acceso, rectificación, actualización y supresión cuando corresponda.</p>
          </section>

          <section className="mt-7 space-y-3">
            <h2 className="text-xl font-extrabold text-purple-900">7. Contacto para solicitudes de privacidad</h2>
            <p>Para consultas, solicitudes de acceso, corrección, actualización o eliminación de datos personales, puede comunicarse por estos medios:</p>
            <div className="rounded-2xl bg-purple-50 p-5">
              <p><strong>Correo electrónico:</strong> <a className="font-bold text-purple-800 underline" href="mailto:materialmr06@gmail.com">materialmr06@gmail.com</a></p>
              <p className="mt-2"><strong>WhatsApp:</strong> <a className="font-bold text-purple-800 underline" href="https://wa.me/50683943170" target="_blank" rel="noopener noreferrer">+506 8394-3170</a></p>
            </div>
          </section>

          <section className="mt-7 space-y-3">
            <h2 className="text-xl font-extrabold text-purple-900">8. Consentimiento</h2>
            <p>Cuando el cliente marque expresamente la casilla de aceptación correspondiente, confirmará que ha leído esta política y autoriza el tratamiento de sus datos para las finalidades indicadas. La casilla deberá aparecer desmarcada inicialmente. La aceptación de comunicaciones publicitarias, si se ofrece, deberá ser independiente y opcional.</p>
          </section>

          <div className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">
            <strong>Nota:</strong> Esta política es un texto informativo inicial para la operación de la tienda y debe revisarse antes del lanzamiento para confirmar, entre otros aspectos, el domicilio legal para notificaciones, los proveedores y transferencias internacionales de datos, los plazos concretos de conservación y cualquier obligación de inscripción o trámite ante PRODHAB. No sustituye asesoría legal.
          </div>
        </article>

        <p className="mt-6 text-center text-xs text-slate-500">© 2027 Material Didáctico MR. Todos los derechos reservados.</p>
      </div>
    </main>
  );
}
