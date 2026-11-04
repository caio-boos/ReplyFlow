const tools = {
  shared: {
    selectVideo: "Select a video file.",
    videoTooLarge: "The video must be smaller than {max} MB.",
    dropzone: "Drag a video here or click to select one",
    changeVideo: "Change video",
    pause: "Pause",
    playClip: "Play clip",
    compare: "Compare:",
    downloadVideo: "Download video",
    processing: "Processing…",
    undo: "Undo",
  },
  timeline: {
    range: "Clip to edit: <range>{start}s → {end}s</range> <length>({length}s)</length>",
    wholeVideo: "Whole video",
  },
  stages: {
    loadingEngine: "Loading video engine…",
    preparingMask: "Preparing mask…",
    preparingVideo: "Preparing video…",
    uploading: "Uploading to the AI…",
    rebuildingEdges: "Rebuilding edges…",
    rebuildingBackground: "Rebuilding the background (may take 1–2 min)…",
    generating: "Generating the new video (this may take a few minutes)…",
    downloading: "Downloading result…",
    composing: "Assembling final video…",
  },
  clone: {
    title: "AI Video Clone",
    subtitle:
      "Reuse a video that already performs: describe the changes and the AI regenerates the clip while keeping the original motion.",
    disclaimer:
      "Only use content you own or have licensed. Don't create fake testimonials or change the appearance of real people without their permission.",
    dropzoneHint: "MP4, MOV or WebM · 2 to 10 second clip · up to {max} MB",
    maxReferences:
      "{model} accepts up to {count, plural, one {# image} other {# images}}.",
    readImageFailed: "Couldn't read “{name}”.",
    improved: "Prompt rewritten in the model's format.",
    describeChanges: "Describe what you want to change in the video.",
    clipRange: "{model} accepts clips from {min}s to {max}s.",
    clipRangeCurrent:
      "{model} accepts clips from {min}s to {max}s. The current clip is {current}s.",
    generated: "Video generated.",
    promptLabel: "What to change in the video",
    improveTitle: "Rewrites it in English, in the imperative, with one instruction per image",
    improving: "Improving…",
    improve: "✨ Improve prompt",
    promptHint: "Describe the result, not the steps.",
    referencesUncited:
      "You uploaded reference images but didn't mention any of them in the prompt. {model} ignores images that aren't mentioned — click {tag} below to insert one.",
    referencesLabel: "Reference images (face or style)",
    removeImage: "Remove image",
    insertInPrompt: "Insert into prompt",
    referencesTagHint:
      "Mention the image in the prompt by its tag so the model uses it. E.g. “replace the woman on the left with {tag}”.",
    referencesHint: "References anchor the result and reduce distortion.",
    modelLabel: "Model",
    intensityLabel: "Intensity",
    intensityAppended:
      "{model} has no intensity parameter. This is appended to your prompt: <clause>“{clause}”</clause>",
    intensityNothingAppended:
      "{model} has no intensity parameter. With this option nothing is appended — your prompt is sent exactly as written.",
    generate: "Generate video",
    viewResult: "Result",
    viewOriginal: "Original",
    checkProduct: "Check that the product isn't distorted.",
    adjustPrompt: "Adjust prompt",
    replicateLink: "View the exact input and logs for this generation on Replicate ↗",
    models: {
      kling: {
        summary:
          "Edits with natural language while preserving the original motion. Reference images anchor face and style — the best choice for changing someone's appearance.",
        placeholder:
          "E.g. replace the woman on the left with {tag}, keeping the same camera movement, the same product in her hands and the same background. Remove all on-screen text.",
      },
      wan: {
        summary:
          "Open source and cheaper. Preserves motion and structure and accepts a single reference image.",
        placeholder:
          "E.g. swap the jacket for a beige blazer and make the lighting warmer. Keep the product and the motion the same.",
      },
      luma: {
        summary:
          "Direct control over how far the result can drift from the original, and accepts clips up to 30s. Doesn't use reference images.",
        placeholder:
          "E.g. give the scene a late-afternoon feel, with golden light and warmer tones. Keep the product and the motion the same.",
      },
    },
    intensity: {
      subtle: {
        label: "Subtle",
        hint: "Only changes what you asked for. Always start here.",
      },
      balanced: {
        label: "Balanced",
        hint: "Allows style adjustments while keeping the scene recognizable.",
      },
      bold: {
        label: "Free",
        hint: "Lets the model reinterpret the scene. Higher risk of distorting the product.",
      },
    },
  },
  watermark: {
    title: "Remove watermark",
    subtitle:
      "Upload a short video, paint over the watermark and download the result in 720p. All processing happens in your browser.",
    disclaimer:
      "Only use this on videos you made or are authorized to edit. Removing watermarks from third-party content violates copyright and platform terms.",
    dropzoneHint: "MP4, MOV or WebM · ideally 1 to 20 seconds · up to {max} MB",
    longVideo: "Videos longer than 30s may take a while to process.",
    processed: "Video processed.",
    brush: "Brush",
    rect: "Rectangle",
    size: "Size",
    margin: "Margin",
    captionPreset: "Caption preset",
    captionPresetTitle: "Rectangle with a wide margin that covers the outline of the letters",
    eraser: "Eraser",
    undoTitle: "Undo (Ctrl+Z)",
    redo: "Redo",
    redoTitle: "Redo (Ctrl+Shift+Z)",
    clearMask: "Clear mask",
    modes: {
      ai: {
        title: "AI — natural",
        hint: "Rebuilds the background from neighboring frames and applies it only inside the mask. ~1–2 min, costs a few cents.",
      },
      local: {
        title: "Fast — in the browser",
        hint: "Interpolates from the edges. Only works well on flat backgrounds; blurs if there's motion.",
      },
    },
    submit: "Remove watermark",
    viewFinal: "Final",
    viewRaw: "AI output",
    ghostHint:
      "If the ghosting only shows up in “Final”, the mask is right and the problem is the compositing.",
    adjustMask: "Adjust mask",
  },
  errors: {
    aiFailed: "The AI couldn't process the video.",
    aiTimeout: "Timed out waiting for the AI result.",
    uploadFailed: "Couldn't upload the video.",
    processFailed: "Couldn't process the video.",
    ffmpegExit: "ffmpeg exited with code {code}.",
    ffmpegNoOutput: "ffmpeg didn't produce any video.",
    uploadPrepareFailed: "Couldn't prepare the video for upload.",
    canvasUnavailable: "Canvas unavailable.",
    maskEmpty: "Paint over the watermark before processing.",
    maskFailed: "Couldn't generate the mask.",
    referencePrepareFailed: "Couldn't prepare the reference image.",
    aiNoPrompt: "The AI didn't return a prompt.",
    replicateInvalidToken: "Invalid or expired token.",
    replicateStatus: "Replicate responded with status {status}.",
    replicateModelNotFound: "Model “{slug}” not found on Replicate.",
    replicateMissingInputs: "Model “{slug}” doesn't accept the required inputs: {inputs}.",
    replicateNoCredit:
      "Replicate declined due to insufficient credit. Check at replicate.com/account/billing that the credit is on the SAME account as the token (see the user under Settings → Integrations). Credit purchases take a few minutes to become available.",
    replicateRejected: "Replicate rejected the job ({status}): {detail}",
    replicateNoId: "Replicate didn't return the prediction ID.",
    replicateSendFailed: "Couldn't send to Replicate.",
    missingVideo: "Missing the 'video' file.",
    missingVideoAndMask: "Missing the 'video' and 'mask' files.",
    promptRequired: "Describe the changes you want in the video.",
    promptTooLong: "The prompt must be at most {max} characters.",
    invalidModel: "Invalid model.",
    videoTooLargeCompressed: "The video is too large after compression. Use a shorter clip.",
    noReferenceImages: "{model} doesn't accept reference images.",
    tooManyReferences:
      "{model} accepts up to {count, plural, one {# reference image} other {# reference images}}.",
    referenceTooLarge: "The reference image is too large.",
    maskTooLarge: "The mask is too large.",
    tokenMissing: "Set up your Replicate token under Settings → Integrations.",
    tokenNotConfigured: "Replicate token not configured.",
    jobNotFound: "Job not found.",
    jobStatusFailed: "Couldn't check the job status.",
    resultNotReady: "The result isn't available yet.",
    unexpectedOutputUrl: "Unexpected output URL.",
    downloadFailed: "Couldn't download the result.",
    openaiKeyMissing: "OPENAI_API_KEY is not configured.",
    writePromptFirst: "Write your request first.",
    improveFailed: "Couldn't improve the prompt.",
  },
};

export default tools;
