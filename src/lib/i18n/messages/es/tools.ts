import type { Messages } from "../en";

const tools: Messages["tools"] = {
  shared: {
    selectVideo: "Selecciona un archivo de video.",
    videoTooLarge: "El video debe pesar menos de {max} MB.",
    dropzone: "Arrastra un video o haz clic para seleccionarlo",
    changeVideo: "Cambiar video",
    pause: "Pausar",
    playClip: "Reproducir fragmento",
    compare: "Comparar:",
    downloadVideo: "Descargar video",
    processing: "Procesando…",
    undo: "Deshacer",
  },
  timeline: {
    range: "Fragmento a editar: <range>{start}s → {end}s</range> <length>({length}s)</length>",
    wholeVideo: "Video completo",
  },
  stages: {
    loadingEngine: "Cargando el motor de video…",
    preparingMask: "Preparando la máscara…",
    preparingVideo: "Preparando el video…",
    uploading: "Enviando a la IA…",
    rebuildingEdges: "Reconstruyendo los bordes…",
    rebuildingBackground: "Reconstruyendo el fondo (puede tardar 1-2 min)…",
    generating: "Generando el nuevo video (puede tardar unos minutos)…",
    downloading: "Descargando el resultado…",
    composing: "Montando el video final…",
  },
  clone: {
    title: "Clonar video con IA",
    subtitle:
      "Reutiliza un video que ya funciona: describe los cambios y la IA regenera el fragmento manteniendo el movimiento original.",
    disclaimer:
      "Usa solo contenido propio o con licencia. No generes testimonios falsos ni alteres la apariencia de personas reales sin su autorización.",
    dropzoneHint: "MP4, MOV o WebM · fragmento de 2 a 10 segundos · hasta {max} MB",
    maxReferences:
      "{model} acepta como máximo {count, plural, one {# imagen} other {# imágenes}}.",
    readImageFailed: "No se pudo leer “{name}”.",
    improved: "Prompt reescrito en el formato del modelo.",
    describeChanges: "Describe lo que quieres cambiar en el video.",
    clipRange: "{model} acepta fragmentos de {min}s a {max}s.",
    clipRangeCurrent:
      "{model} acepta fragmentos de {min}s a {max}s. El fragmento actual dura {current}s.",
    generated: "Video generado.",
    promptLabel: "Qué cambiar en el video",
    improveTitle: "Lo reescribe en inglés, en imperativo y con una instrucción por imagen",
    improving: "Mejorando…",
    improve: "✨ Mejorar prompt",
    promptHint: "Describe el resultado, no el paso a paso.",
    referencesUncited:
      "Subiste imágenes de referencia, pero no mencionaste ninguna en el prompt. {model} ignora las imágenes que no se mencionan: haz clic en {tag} abajo para insertarla.",
    referencesLabel: "Imágenes de referencia (rostro o estilo)",
    removeImage: "Quitar imagen",
    insertInPrompt: "Insertar en el prompt",
    referencesTagHint:
      "Menciona la imagen en el prompt con su marcador para que el modelo la use. Ej.: “reemplaza a la mujer de la izquierda por {tag}”.",
    referencesHint: "Las referencias anclan el resultado y reducen la deformación.",
    modelLabel: "Modelo",
    intensityLabel: "Intensidad",
    intensityAppended:
      "{model} no tiene parámetro de intensidad. Esto se añade a tu prompt: <clause>“{clause}”</clause>",
    intensityNothingAppended:
      "{model} no tiene parámetro de intensidad. Con esta opción no se añade nada: tu prompt se envía exactamente como lo escribiste.",
    generate: "Generar video",
    viewResult: "Resultado",
    viewOriginal: "Original",
    checkProduct: "Comprueba que el producto no se haya deformado.",
    adjustPrompt: "Ajustar prompt",
    replicateLink: "Ver la entrada exacta y los logs de esta generación en Replicate ↗",
    models: {
      kling: {
        summary:
          "Edita con lenguaje natural preservando el movimiento original. Las imágenes de referencia anclan el rostro y el estilo: la mejor opción para cambiar la apariencia.",
        placeholder:
          "Ej.: replace the woman on the left with {tag}, keeping the same camera movement, the same product in her hands and the same background. Remove all on-screen text.",
      },
      wan: {
        summary:
          "Open source y más económico. Preserva el movimiento y la estructura y acepta una sola imagen de referencia.",
        placeholder:
          "Ej.: cambia la chaqueta por un blazer beige y haz la iluminación más cálida. Mantén el producto y el movimiento iguales.",
      },
      luma: {
        summary:
          "Control directo de cuánto puede alejarse el resultado del original y acepta fragmentos de hasta 30s. No usa imágenes de referencia.",
        placeholder:
          "Ej.: dale a la escena un ambiente de atardecer, con luz dorada y tonos más cálidos. Mantén el producto y el movimiento iguales.",
      },
    },
    intensity: {
      subtle: {
        label: "Sutil",
        hint: "Solo cambia lo que pediste. Empieza siempre por aquí.",
      },
      balanced: {
        label: "Equilibrada",
        hint: "Permite ajustes de estilo manteniendo la escena reconocible.",
      },
      bold: {
        label: "Libre",
        hint: "Deja que el modelo reinterprete la escena. Mayor riesgo de deformar el producto.",
      },
    },
  },
  watermark: {
    title: "Quitar marca de agua",
    subtitle:
      "Sube un video corto, pinta sobre la marca de agua y descarga el resultado en 720p. Todo el procesamiento ocurre en tu navegador.",
    disclaimer:
      "Úsalo solo en videos que hayas producido o que tengas autorización para editar. Quitar marcas de agua de contenido de terceros infringe los derechos de autor y los términos de las plataformas.",
    dropzoneHint: "MP4, MOV o WebM · idealmente de 1 a 20 segundos · hasta {max} MB",
    longVideo: "Los videos de más de 30s pueden tardar bastante en procesarse.",
    processed: "Video procesado.",
    brush: "Pincel",
    rect: "Rectángulo",
    size: "Tamaño",
    margin: "Margen",
    captionPreset: "Preset subtítulos",
    captionPresetTitle: "Rectángulo con un margen amplio que cubre el contorno de las letras",
    eraser: "Borrador",
    undoTitle: "Deshacer (Ctrl+Z)",
    redo: "Rehacer",
    redoTitle: "Rehacer (Ctrl+Shift+Z)",
    clearMask: "Borrar máscara",
    modes: {
      ai: {
        title: "IA — natural",
        hint: "Reconstruye el fondo con los fotogramas vecinos y lo aplica solo dentro de la máscara. ~1-2 min, cuesta centavos.",
      },
      local: {
        title: "Rápido — en el navegador",
        hint: "Interpola desde el borde. Solo funciona bien con fondos lisos; difumina si hay movimiento.",
      },
    },
    submit: "Quitar marca de agua",
    viewFinal: "Final",
    viewRaw: "Salida de la IA",
    ghostHint:
      "Si el efecto fantasma solo aparece en “Final”, la máscara está bien y el problema es la composición.",
    adjustMask: "Ajustar máscara",
  },
  errors: {
    aiFailed: "La IA no pudo procesar el video.",
    aiTimeout: "Se agotó el tiempo de espera del resultado de la IA.",
    uploadFailed: "No se pudo enviar el video.",
    processFailed: "No se pudo procesar el video.",
    ffmpegExit: "ffmpeg terminó con el código {code}.",
    ffmpegNoOutput: "ffmpeg no generó ningún video.",
    uploadPrepareFailed: "No se pudo preparar el video para el envío.",
    canvasUnavailable: "Canvas no disponible.",
    maskEmpty: "Pinta sobre la marca de agua antes de procesar.",
    maskFailed: "No se pudo generar la máscara.",
    referencePrepareFailed: "No se pudo preparar la imagen de referencia.",
    aiNoPrompt: "La IA no devolvió ningún prompt.",
    replicateInvalidToken: "Token no válido o caducado.",
    replicateStatus: "Replicate respondió con el estado {status}.",
    replicateModelNotFound: "No se encontró el modelo “{slug}” en Replicate.",
    replicateMissingInputs: "El modelo “{slug}” no acepta las entradas necesarias: {inputs}.",
    replicateNoCredit:
      "Replicate rechazó la solicitud por falta de crédito. Confirma en replicate.com/account/billing que el crédito está en la MISMA cuenta del token (consulta el usuario en Configuración → Integraciones). Las compras de crédito tardan unos minutos en activarse.",
    replicateRejected: "Replicate rechazó el job ({status}): {detail}",
    replicateNoId: "Replicate no devolvió el ID de la predicción.",
    replicateSendFailed: "No se pudo enviar a Replicate.",
    missingVideo: "Falta el archivo 'video'.",
    missingVideoAndMask: "Faltan los archivos 'video' y 'mask'.",
    promptRequired: "Describe los cambios que quieres en el video.",
    promptTooLong: "El prompt debe tener como máximo {max} caracteres.",
    invalidModel: "Modelo no válido.",
    videoTooLargeCompressed:
      "El video es demasiado grande después de la compresión. Usa un fragmento más corto.",
    noReferenceImages: "{model} no acepta imágenes de referencia.",
    tooManyReferences:
      "{model} acepta como máximo {count, plural, one {# imagen de referencia} other {# imágenes de referencia}}.",
    referenceTooLarge: "La imagen de referencia es demasiado grande.",
    maskTooLarge: "La máscara es demasiado grande.",
    tokenMissing: "Configura tu token de Replicate en Configuración → Integraciones.",
    tokenNotConfigured: "Token de Replicate no configurado.",
    jobNotFound: "Job no encontrado.",
    jobStatusFailed: "No se pudo consultar el estado del job.",
    resultNotReady: "El resultado aún no está disponible.",
    unexpectedOutputUrl: "URL de salida inesperada.",
    downloadFailed: "No se pudo descargar el resultado.",
    openaiKeyMissing: "OPENAI_API_KEY no está configurada.",
    writePromptFirst: "Escribe tu pedido primero.",
    improveFailed: "No se pudo mejorar el prompt.",
  },
};

export default tools;
