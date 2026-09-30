# Pruebas de OCR con tarjetas reales

Prueba con 15–20 tarjetas variadas en móvil real (iOS y Android). Marca ✔ si el campo salió bien, ✎ si hubo que corregirlo, ✘ si no se detectó.

| # | Tarjeta (empresa / tipo) | Dispositivo | Tiempo (s) | Nombre | Empresa | Cargo | Teléfono | Correo | Web | Observaciones (fuente, fondo, logo…) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | | |
| 2 | | | | | | | | | | |
| 3 | | | | | | | | | | |

## Fallos detectados

-

## Comprobaciones transversales

- [ ] Pestaña Network: ninguna petición de OCR a terceros (solo los datos de idioma de Tesseract la primera vez).
- [ ] Flujo completo foto → guardado en menos de un minuto.
- [ ] Excel abre bien en Excel y Google Sheets (acentos y teléfonos con `+`).
