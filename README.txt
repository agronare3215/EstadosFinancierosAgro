Agronare — Metadatos avanzados (Portada + Metadatos + Firma simulada + JSON)
==============================================================================

Qué hay de nuevo:
 - Página de metadatos visual y técnica (sello del sistema, firma simulada en base64).
 - Página de resumen JSON que contiene: empresa, rfc, exportador, periodo, timestamp, SHA-256 del informe, sello y totales detectados.
 - Botón para descargar el JSON de metadatos.
 - La exportación a PDF incluye portada, página de metadatos y el informe.

Limitaciones y notas:
 - La "firma" mostrada es una huella criptográfica (SHA-256) y una representación base64 calculada en el navegador: sirve para trazabilidad y verificación interna, pero **no** reemplaza una firma digital legal (RFC FIEL/CFDI).
 - Para cumplir requisitos legales de firmas digitales/SELLO digital registre e incluya certificados y use un backend seguro/HSM para firmar.
 - Para archivado oficial en PDF/A, convierta/valide el PDF en servidor con Ghostscript / VeraPDF.

Instrucciones:
 1. Descomprime el ZIP.
 2. Abre index.html en Chrome/Edge.
 3. Rellena Nombre, RFC y Usuario que exporta. Genera un informe (Estado Resultado) y pulsa "Exportar PDF".
 4. Descarga el JSON de metadatos con "Descargar Metadatos (JSON)".

Si quieres, puedo:
 - Añadir firma digital real (FIEL) en backend vinculada a Vault/HSM y embebida en el PDF como firma PAdES. (Requiere backend y manejo de certificados)
 - Integrar validación PDF/A automática en servidor con VeraPDF y devolver resultado de conformidad.

Generado por ChatGPT — Agronare (Raúl Gonzáles)
