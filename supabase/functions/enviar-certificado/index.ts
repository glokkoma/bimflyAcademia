import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { nombre_alumno, email_alumno, nombre_curso } = await req.json()

    console.log(`--- INICIANDO PROCESO PARA: ${email_alumno} ---`);

    // 1. SOLICITUD A PDFMONKEY
    const pdfResponse = await fetch("https://api.pdfmonkey.io/api/v1/documents", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get('PDFMONKEY_API_KEY')}`
      },
      body: JSON.stringify({
        document: {
          document_template_id: Deno.env.get('PDFMONKEY_TEMPLATE_ID'),
          payload: {
            nombre_alumno,
            nombre_curso,
            fecha: new Date().toLocaleDateString('es-ES')
          },
          status: "pending" // Volvemos a pending que es más estable
        }
      })
    })
    
    const pdfData = await pdfResponse.json()

    // SI PDFMONKEY DEVUELVE ERROR, LO CAPTURAMOS AQUÍ
    if (!pdfData.document) {
      console.error("ERROR DETALLADO DE PDFMONKEY:", JSON.stringify(pdfData));
      throw new Error(pdfData.errors ? pdfData.errors[0].detail : "Error desconocido en PDFMonkey");
    }

    const pdfUrl = pdfData.document.download_url || pdfData.document.preview_url;
    console.log("PDF Creado con éxito. Enlace:", pdfUrl);

    // 2. ENVÍO CON RESEND
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get('RESEND_API_KEY')}`
      },
      body: JSON.stringify({
        from: "Bimfli Academy <onboarding@resend.dev>",
        to: [email_alumno],
        subject: `🏆 ¡Felicidades! Tu diploma de ${nombre_curso}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
            <h1 style="color: #ff3366;">¡Enhorabuena, ${nombre_alumno}!</h1>
            <p>Has completado con éxito <strong>${nombre_curso}</strong>.</p>
            <p>Puedes descargar tu diploma oficial aquí:</p>
            <a href="${pdfUrl}" style="display:inline-block; background:#1a1a2e; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">Descargar PDF</a>
          </div>
        `
      })
    })

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    })

  } catch (error) {
    console.error("LOG DEL ERROR:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" }, 
      status: 400 
    })
  }
})