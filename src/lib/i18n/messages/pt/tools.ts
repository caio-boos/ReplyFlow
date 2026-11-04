import type { Messages } from "../en";

const tools: Messages["tools"] = {
  shared: {
    selectVideo: "Selecione um arquivo de vídeo.",
    videoTooLarge: "O vídeo precisa ter menos de {max}MB.",
    dropzone: "Arraste um vídeo ou clique para selecionar",
    changeVideo: "Trocar vídeo",
    pause: "Pausar",
    playClip: "Reproduzir trecho",
    compare: "Comparar:",
    downloadVideo: "Baixar vídeo",
    processing: "Processando…",
    undo: "Desfazer",
  },
  timeline: {
    range: "Trecho a corrigir: <range>{start}s → {end}s</range> <length>({length}s)</length>",
    wholeVideo: "Vídeo inteiro",
  },
  stages: {
    loadingEngine: "Carregando motor de vídeo…",
    preparingMask: "Preparando máscara…",
    preparingVideo: "Preparando vídeo…",
    uploading: "Enviando para a IA…",
    rebuildingEdges: "Reconstruindo bordas…",
    rebuildingBackground: "Reconstruindo o fundo (pode levar 1-2 min)…",
    generating: "Gerando o novo vídeo (pode levar alguns minutos)…",
    downloading: "Baixando resultado…",
    composing: "Montando vídeo final…",
  },
  clone: {
    title: "Clonar vídeo com IA",
    subtitle:
      "Reaproveite um vídeo que funciona: descreva as mudanças e a IA regenera o trecho mantendo o movimento original.",
    disclaimer:
      "Use apenas conteúdo próprio ou licenciado. Não gere depoimentos falsos nem altere a aparência de pessoas reais sem autorização delas.",
    dropzoneHint: "MP4, MOV ou WebM · trecho de 2 a 10 segundos · até {max}MB",
    maxReferences:
      "{model} aceita no máximo {count, plural, one {# imagem} other {# imagens}}.",
    readImageFailed: "Não foi possível ler “{name}”.",
    improved: "Prompt reescrito no formato do modelo.",
    describeChanges: "Descreva o que você quer mudar no vídeo.",
    clipRange: "{model} aceita trechos de {min}s a {max}s.",
    clipRangeCurrent: "{model} aceita trechos de {min}s a {max}s. O trecho atual tem {current}s.",
    generated: "Vídeo gerado.",
    promptLabel: "O que mudar no vídeo",
    improveTitle: "Reescreve em inglês, no imperativo e com uma instrução por imagem",
    improving: "Melhorando…",
    improve: "✨ Melhorar prompt",
    promptHint: "Descreva o resultado, não o passo a passo.",
    referencesUncited:
      "Você enviou imagens de referência mas não citou nenhuma no prompt. O {model} ignora imagens que não sejam mencionadas — clique em {tag} abaixo para inserir.",
    referencesLabel: "Imagens de referência (rosto ou estilo)",
    removeImage: "Remover imagem",
    insertInPrompt: "Inserir no prompt",
    referencesTagHint:
      "Cite a imagem no prompt pelo marcador para o modelo usá-la. Ex.: “substitua a mulher à esquerda por {tag}”.",
    referencesHint: "As referências ancoram o resultado e reduzem a deformação.",
    modelLabel: "Modelo",
    intensityLabel: "Intensidade",
    intensityAppended:
      "{model} não tem parâmetro de intensidade. Isto é acrescentado ao seu prompt: <clause>“{clause}”</clause>",
    intensityNothingAppended:
      "{model} não tem parâmetro de intensidade. Nesta opção nada é acrescentado — seu prompt vai exatamente como escrito.",
    generate: "Gerar vídeo",
    viewResult: "Resultado",
    viewOriginal: "Original",
    checkProduct: "Confira se o produto não deformou.",
    adjustPrompt: "Ajustar prompt",
    replicateLink: "Ver a entrada exata e os logs desta geração no Replicate ↗",
    models: {
      kling: {
        summary:
          "Edita por linguagem natural preservando o movimento original. As imagens de referência ancoram rosto e estilo — melhor escolha para trocar a aparência.",
        placeholder:
          "Ex.: replace the woman on the left with {tag}, keeping the same camera movement, the same product in her hands and the same background. Remove all on-screen text.",
      },
      wan: {
        summary:
          "Open source, mais barato. Preserva movimento e estrutura e aceita uma única imagem de referência.",
        placeholder:
          "Ex.: troque a jaqueta por um blazer bege e deixe a iluminação mais quente. Mantenha o produto e o movimento iguais.",
      },
      luma: {
        summary:
          "Controle direto de quanto o resultado pode se afastar do original e aceita trechos de até 30s. Não usa imagens de referência.",
        placeholder:
          "Ex.: deixe a cena com clima de fim de tarde, luz dourada e tons mais quentes. Mantenha o produto e o movimento iguais.",
      },
    },
    intensity: {
      subtle: {
        label: "Sutil",
        hint: "Mexe só no que você pediu. Comece sempre por aqui.",
      },
      balanced: {
        label: "Equilibrada",
        hint: "Permite ajustes de estilo mantendo a cena reconhecível.",
      },
      bold: {
        label: "Livre",
        hint: "Deixa o modelo reinterpretar a cena. Maior risco de deformar o produto.",
      },
    },
  },
  watermark: {
    title: "Remover marca d'água",
    subtitle:
      "Envie um vídeo curto, pinte sobre a marca d'água e baixe o resultado em 720p. Todo o processamento acontece no seu navegador.",
    disclaimer:
      "Use apenas em vídeos que você produziu ou tem autorização para editar. Remover marcas d'água de conteúdo de terceiros viola direitos autorais e os termos das plataformas.",
    dropzoneHint: "MP4, MOV ou WebM · ideal de 1 a 20 segundos · até {max}MB",
    longVideo: "Vídeos acima de 30s podem demorar bastante para processar.",
    processed: "Vídeo processado.",
    brush: "Pincel",
    rect: "Retângulo",
    size: "Tamanho",
    margin: "Margem",
    captionPreset: "Preset legenda",
    captionPresetTitle: "Retângulo com margem larga, que cobre o contorno das letras",
    eraser: "Borracha",
    undoTitle: "Desfazer (Ctrl+Z)",
    redo: "Refazer",
    redoTitle: "Refazer (Ctrl+Shift+Z)",
    clearMask: "Limpar máscara",
    modes: {
      ai: {
        title: "IA — natural",
        hint: "Reconstrói o fundo com os frames vizinhos e aplica só dentro da máscara. ~1-2 min, custa centavos.",
      },
      local: {
        title: "Rápido — no navegador",
        hint: "Interpola a borda. Só funciona bem em fundo liso; borra se tiver movimento.",
      },
    },
    submit: "Remover marca d'água",
    viewFinal: "Final",
    viewRaw: "Saída da IA",
    ghostHint:
      "Se o fantasma só aparece em “Final”, a máscara está certa e o problema é a composição.",
    adjustMask: "Ajustar máscara",
  },
  errors: {
    aiFailed: "A IA não conseguiu processar o vídeo.",
    aiTimeout: "Tempo esgotado esperando o resultado da IA.",
    uploadFailed: "Falha ao enviar o vídeo.",
    processFailed: "Falha ao processar o vídeo.",
    ffmpegExit: "ffmpeg terminou com código {code}.",
    ffmpegNoOutput: "O ffmpeg não gerou nenhum vídeo.",
    uploadPrepareFailed: "Falha ao preparar o vídeo para envio.",
    canvasUnavailable: "Canvas indisponível.",
    maskEmpty: "Pinte sobre a marca d'água antes de processar.",
    maskFailed: "Falha ao gerar a máscara.",
    referencePrepareFailed: "Não foi possível preparar a imagem de referência.",
    aiNoPrompt: "A IA não retornou um prompt.",
    replicateInvalidToken: "Token inválido ou expirado.",
    replicateStatus: "Replicate respondeu {status}.",
    replicateModelNotFound: "Modelo “{slug}” não encontrado no Replicate.",
    replicateMissingInputs: "Modelo “{slug}” não aceita as entradas necessárias: {inputs}.",
    replicateNoCredit:
      "O Replicate recusou por falta de crédito. Confirme em replicate.com/account/billing que o crédito está na MESMA conta do token (veja o usuário em Configurações → Integrações). Compras de crédito levam alguns minutos para liberar.",
    replicateRejected: "Replicate recusou o job ({status}): {detail}",
    replicateNoId: "Replicate não retornou o id da predição.",
    replicateSendFailed: "Falha ao enviar para o Replicate.",
    missingVideo: "Envie o arquivo 'video'.",
    missingVideoAndMask: "Envie os arquivos 'video' e 'mask'.",
    promptRequired: "Descreva as mudanças que você quer no vídeo.",
    promptTooLong: "O prompt precisa ter até {max} caracteres.",
    invalidModel: "Modelo inválido.",
    videoTooLargeCompressed: "Vídeo muito grande após a compressão. Use um trecho mais curto.",
    noReferenceImages: "{model} não aceita imagens de referência.",
    tooManyReferences:
      "{model} aceita no máximo {count, plural, one {# imagem de referência} other {# imagens de referência}}.",
    referenceTooLarge: "Imagem de referência muito grande.",
    maskTooLarge: "Máscara muito grande.",
    tokenMissing: "Configure seu token do Replicate em Configurações → Integrações.",
    tokenNotConfigured: "Token do Replicate não configurado.",
    jobNotFound: "Job não encontrado.",
    jobStatusFailed: "Falha ao consultar o job.",
    resultNotReady: "Resultado ainda não disponível.",
    unexpectedOutputUrl: "URL de saída inesperada.",
    downloadFailed: "Falha ao baixar o resultado.",
    openaiKeyMissing: "OPENAI_API_KEY não configurada.",
    writePromptFirst: "Escreva o pedido antes.",
    improveFailed: "Falha ao melhorar o prompt.",
  },
};

export default tools;
