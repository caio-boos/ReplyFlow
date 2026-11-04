import type { Messages } from "../en";

const tools: Messages["tools"] = {
  shared: {
    selectVideo: "Sélectionnez un fichier vidéo.",
    videoTooLarge: "La vidéo doit faire moins de {max} Mo.",
    dropzone: "Glissez une vidéo ici ou cliquez pour la sélectionner",
    changeVideo: "Changer de vidéo",
    pause: "Pause",
    playClip: "Lire l'extrait",
    compare: "Comparer :",
    downloadVideo: "Télécharger la vidéo",
    processing: "Traitement…",
    undo: "Annuler",
  },
  timeline: {
    range: "Extrait à modifier : <range>{start} s → {end} s</range> <length>({length} s)</length>",
    wholeVideo: "Vidéo entière",
  },
  stages: {
    loadingEngine: "Chargement du moteur vidéo…",
    preparingMask: "Préparation du masque…",
    preparingVideo: "Préparation de la vidéo…",
    uploading: "Envoi à l'IA…",
    rebuildingEdges: "Reconstruction des bords…",
    rebuildingBackground: "Reconstruction de l'arrière-plan (1 à 2 min)…",
    generating: "Génération de la nouvelle vidéo (cela peut prendre quelques minutes)…",
    downloading: "Téléchargement du résultat…",
    composing: "Assemblage de la vidéo finale…",
  },
  clone: {
    title: "Cloner une vidéo avec l'IA",
    subtitle:
      "Réutilisez une vidéo qui fonctionne : décrivez les modifications et l'IA régénère l'extrait en conservant le mouvement d'origine.",
    disclaimer:
      "Utilisez uniquement du contenu qui vous appartient ou sous licence. Ne créez pas de faux témoignages et ne modifiez pas l'apparence de personnes réelles sans leur autorisation.",
    dropzoneHint: "MP4, MOV ou WebM · extrait de 2 à 10 secondes · jusqu'à {max} Mo",
    maxReferences:
      "{model} accepte au maximum {count, plural, one {# image} other {# images}}.",
    readImageFailed: "Impossible de lire « {name} ».",
    improved: "Prompt réécrit au format du modèle.",
    describeChanges: "Décrivez ce que vous voulez modifier dans la vidéo.",
    clipRange: "{model} accepte des extraits de {min} s à {max} s.",
    clipRangeCurrent:
      "{model} accepte des extraits de {min} s à {max} s. L'extrait actuel dure {current} s.",
    generated: "Vidéo générée.",
    promptLabel: "Ce qu'il faut modifier dans la vidéo",
    improveTitle: "Le réécrit en anglais, à l'impératif, avec une instruction par image",
    improving: "Amélioration…",
    improve: "✨ Améliorer le prompt",
    promptHint: "Décrivez le résultat, pas les étapes.",
    referencesUncited:
      "Vous avez envoyé des images de référence sans en citer aucune dans le prompt. {model} ignore les images qui ne sont pas mentionnées — cliquez sur {tag} ci-dessous pour l'insérer.",
    referencesLabel: "Images de référence (visage ou style)",
    removeImage: "Retirer l'image",
    insertInPrompt: "Insérer dans le prompt",
    referencesTagHint:
      "Citez l'image dans le prompt avec son marqueur pour que le modèle l'utilise. Ex. : « remplacez la femme de gauche par {tag} ».",
    referencesHint: "Les références ancrent le résultat et réduisent les déformations.",
    modelLabel: "Modèle",
    intensityLabel: "Intensité",
    intensityAppended:
      "{model} n'a pas de paramètre d'intensité. Ceci est ajouté à votre prompt : <clause>« {clause} »</clause>",
    intensityNothingAppended:
      "{model} n'a pas de paramètre d'intensité. Avec cette option, rien n'est ajouté — votre prompt est envoyé tel quel.",
    generate: "Générer la vidéo",
    viewResult: "Résultat",
    viewOriginal: "Original",
    checkProduct: "Vérifiez que le produit n'est pas déformé.",
    adjustPrompt: "Ajuster le prompt",
    replicateLink: "Voir l'entrée exacte et les logs de cette génération sur Replicate ↗",
    models: {
      kling: {
        summary:
          "Modifie en langage naturel en préservant le mouvement d'origine. Les images de référence ancrent le visage et le style — le meilleur choix pour changer l'apparence.",
        placeholder:
          "Ex. : replace the woman on the left with {tag}, keeping the same camera movement, the same product in her hands and the same background. Remove all on-screen text.",
      },
      wan: {
        summary:
          "Open source et moins cher. Préserve le mouvement et la structure et accepte une seule image de référence.",
        placeholder:
          "Ex. : remplacez la veste par un blazer beige et rendez l'éclairage plus chaud. Gardez le produit et le mouvement identiques.",
      },
      luma: {
        summary:
          "Contrôle direct de l'écart autorisé par rapport à l'original, et accepte des extraits jusqu'à 30 s. N'utilise pas d'images de référence.",
        placeholder:
          "Ex. : donnez à la scène une ambiance de fin d'après-midi, avec une lumière dorée et des tons plus chauds. Gardez le produit et le mouvement identiques.",
      },
    },
    intensity: {
      subtle: {
        label: "Subtile",
        hint: "Ne modifie que ce que vous avez demandé. Commencez toujours par là.",
      },
      balanced: {
        label: "Équilibrée",
        hint: "Autorise des ajustements de style tout en gardant la scène reconnaissable.",
      },
      bold: {
        label: "Libre",
        hint: "Laisse le modèle réinterpréter la scène. Risque plus élevé de déformer le produit.",
      },
    },
  },
  watermark: {
    title: "Supprimer le filigrane",
    subtitle:
      "Envoyez une courte vidéo, peignez sur le filigrane et téléchargez le résultat en 720p. Tout le traitement se fait dans votre navigateur.",
    disclaimer:
      "Utilisez cet outil uniquement sur des vidéos que vous avez produites ou que vous êtes autorisé à modifier. Supprimer le filigrane de contenus de tiers enfreint le droit d'auteur et les conditions des plateformes.",
    dropzoneHint: "MP4, MOV ou WebM · idéalement de 1 à 20 secondes · jusqu'à {max} Mo",
    longVideo: "Les vidéos de plus de 30 s peuvent être longues à traiter.",
    processed: "Vidéo traitée.",
    brush: "Pinceau",
    rect: "Rectangle",
    size: "Taille",
    margin: "Marge",
    captionPreset: "Préréglage sous-titres",
    captionPresetTitle: "Rectangle avec une large marge qui couvre le contour des lettres",
    eraser: "Gomme",
    undoTitle: "Annuler (Ctrl+Z)",
    redo: "Rétablir",
    redoTitle: "Rétablir (Ctrl+Maj+Z)",
    clearMask: "Effacer le masque",
    modes: {
      ai: {
        title: "IA — naturel",
        hint: "Reconstruit l'arrière-plan à partir des images voisines et l'applique uniquement dans le masque. ~1 à 2 min, coûte quelques centimes.",
      },
      local: {
        title: "Rapide — dans le navigateur",
        hint: "Interpole à partir des bords. Ne fonctionne bien que sur un fond uni ; floute s'il y a du mouvement.",
      },
    },
    submit: "Supprimer le filigrane",
    viewFinal: "Final",
    viewRaw: "Sortie de l'IA",
    ghostHint:
      "Si l'effet fantôme n'apparaît que dans « Final », le masque est correct et le problème vient de la composition.",
    adjustMask: "Ajuster le masque",
  },
  errors: {
    aiFailed: "L'IA n'a pas pu traiter la vidéo.",
    aiTimeout: "Délai dépassé en attendant le résultat de l'IA.",
    uploadFailed: "Impossible d'envoyer la vidéo.",
    processFailed: "Impossible de traiter la vidéo.",
    ffmpegExit: "ffmpeg s'est arrêté avec le code {code}.",
    ffmpegNoOutput: "ffmpeg n'a généré aucune vidéo.",
    uploadPrepareFailed: "Impossible de préparer la vidéo pour l'envoi.",
    canvasUnavailable: "Canvas indisponible.",
    maskEmpty: "Peignez sur le filigrane avant de lancer le traitement.",
    maskFailed: "Impossible de générer le masque.",
    referencePrepareFailed: "Impossible de préparer l'image de référence.",
    aiNoPrompt: "L'IA n'a renvoyé aucun prompt.",
    replicateInvalidToken: "Jeton invalide ou expiré.",
    replicateStatus: "Replicate a répondu avec le statut {status}.",
    replicateModelNotFound: "Modèle « {slug} » introuvable sur Replicate.",
    replicateMissingInputs: "Le modèle « {slug} » n'accepte pas les entrées requises : {inputs}.",
    replicateNoCredit:
      "Replicate a refusé faute de crédit. Vérifiez sur replicate.com/account/billing que le crédit se trouve sur le MÊME compte que le jeton (voir l'utilisateur dans Paramètres → Intégrations). Les achats de crédit mettent quelques minutes à être disponibles.",
    replicateRejected: "Replicate a refusé le job ({status}) : {detail}",
    replicateNoId: "Replicate n'a pas renvoyé l'identifiant de la prédiction.",
    replicateSendFailed: "Impossible d'envoyer à Replicate.",
    missingVideo: "Le fichier 'video' est manquant.",
    missingVideoAndMask: "Les fichiers 'video' et 'mask' sont manquants.",
    promptRequired: "Décrivez les modifications souhaitées dans la vidéo.",
    promptTooLong: "Le prompt doit contenir au maximum {max} caractères.",
    invalidModel: "Modèle invalide.",
    videoTooLargeCompressed: "La vidéo est trop volumineuse après compression. Utilisez un extrait plus court.",
    noReferenceImages: "{model} n'accepte pas d'images de référence.",
    tooManyReferences:
      "{model} accepte au maximum {count, plural, one {# image de référence} other {# images de référence}}.",
    referenceTooLarge: "L'image de référence est trop volumineuse.",
    maskTooLarge: "Le masque est trop volumineux.",
    tokenMissing: "Configurez votre jeton Replicate dans Paramètres → Intégrations.",
    tokenNotConfigured: "Jeton Replicate non configuré.",
    jobNotFound: "Job introuvable.",
    jobStatusFailed: "Impossible de vérifier l'état du job.",
    resultNotReady: "Le résultat n'est pas encore disponible.",
    unexpectedOutputUrl: "URL de sortie inattendue.",
    downloadFailed: "Impossible de télécharger le résultat.",
    openaiKeyMissing: "OPENAI_API_KEY n'est pas configurée.",
    writePromptFirst: "Rédigez d'abord votre demande.",
    improveFailed: "Impossible d'améliorer le prompt.",
  },
};

export default tools;
