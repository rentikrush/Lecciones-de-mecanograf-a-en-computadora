const lessons = [
  {
    id: "base",
    level: "Nivel 1 · Calentamiento",
    title: "Encontrá tu ritmo",
    prompt: "faja sala falla; jala la falda.",
  },
  {
    id: "words",
    level: "Nivel 2 · Palabras",
    title: "Soltá las manos",
    prompt: "La práctica diaria hace que tus manos encuentren su lugar.",
  },
  {
    id: "accent",
    level: "Nivel 3 · Con acentos",
    title: "Escribí con intención",
    prompt: "Escribí con calma: cada tecla cuenta y cada intento suma.",
  },
];

const STORAGE_KEY = "tecla-a-tecla-progress-v1";

const els = {
  lessonLevel: document.querySelector("#lesson-level"),
  practiceTitle: document.querySelector("#practice-title"),
  lessonCounter: document.querySelector("#lesson-counter"),
  promptText: document.querySelector("#prompt-text"),
  promptStatus: document.querySelector("#prompt-status"),
  typingInput: document.querySelector("#typing-input"),
  startButton: document.querySelector("#start-button"),
  timeStat: document.querySelector("#time-stat"),
  accuracyStat: document.querySelector("#accuracy-stat"),
  speedStat: document.querySelector("#speed-stat"),
  errorsStat: document.querySelector("#errors-stat"),
  nextKey: document.querySelector("#next-key"),
  coachMessage: document.querySelector("#coach-message"),
  nextLesson: document.querySelector("#next-lesson"),
  progressLabel: document.querySelector("#progress-label"),
  progressBar: document.querySelector("#progress-bar"),
  progressNote: document.querySelector("#progress-note"),
  sessionPill: document.querySelector("#session-pill"),
  resetProgress: document.querySelector("#reset-progress"),
  lessonTabs: [...document.querySelectorAll(".lesson-tab")],
  keys: [...document.querySelectorAll(".key")],
};

let currentLessonId = "base";
let isRunning = false;
let startedAt = null;
let elapsedSeconds = 0;
let timerId = null;
let progress = loadProgress();

function loadProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (stored && typeof stored === "object") {
      return {
        completed: Number(stored.completed) || 0,
        bestWpm: Number(stored.bestWpm) || 0,
        bestAccuracy: Number(stored.bestAccuracy) || 0,
        completedLessons: Array.isArray(stored.completedLessons)
          ? stored.completedLessons
          : [],
      };
    }
  } catch (error) {
    // The practice still works when storage is unavailable.
  }

  return {
    completed: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    completedLessons: [],
  };
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    // Ignore private browsing storage errors.
  }
}

function getCurrentLesson() {
  return lessons.find((lesson) => lesson.id === currentLessonId) || lessons[0];
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");

  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function getStats(value, prompt, seconds) {
  let correct = 0;
  let errors = 0;

  [...value].forEach((character, index) => {
    if (character === prompt[index]) {
      correct += 1;
    } else {
      errors += 1;
    }
  });

  const accuracy = value.length
    ? Math.round((correct / value.length) * 100)
    : 0;

  const minutes = Math.max(seconds / 60, 1 / 60);
  const wpm = Math.round(correct / 5 / minutes);

  return { correct, errors, accuracy, wpm };
}

function keyForCharacter(character) {
  if (!character) return "";
  if (character === " ") return "space";
  if ("áéíóúüÁÉÍÓÚÜ".includes(character)) return "´";
  if (";,".includes(character)) return ",";
  if (".!?".includes(character)) return ".";

  return character.toLowerCase();
}

function renderPrompt(value = "") {
  const prompt = getCurrentLesson().prompt;

  els.promptText.replaceChildren();

  [...prompt].forEach((character, index) => {
    const span = document.createElement("span");

    span.className = "char";
    span.textContent = character;

    if (index < value.length) {
      span.classList.add(
        value[index] === character ? "is-correct" : "is-incorrect"
      );
    } else if (index === value.length && isRunning) {
      span.classList.add("is-current");
    }

    els.promptText.appendChild(span);
  });

  updateNextKey(value);
}

function updateNextKey(value = els.typingInput.value) {
  const prompt = getCurrentLesson().prompt;
  const next = prompt[value.length] || "";
  const key = keyForCharacter(next);

  els.nextKey.textContent =
    key === "space" ? "␠" : (next || "—").toUpperCase();

  els.keys.forEach((element) => {
    element.classList.toggle(
      "is-next",
      Boolean(key) && element.dataset.key === key
    );
  });
}

function updateProgressUI() {
  const completedCount = progress.completedLessons.length;

  els.progressLabel.textContent = `${completedCount} de ${lessons.length}`;
  els.progressBar.style.width = `${Math.round(
    (completedCount / lessons.length) * 100
  )}%`;

  els.sessionPill.textContent = `${progress.completed} ${
    progress.completed === 1 ? "lección completa" : "lecciones completas"
  }`;

  if (completedCount === lessons.length) {
    els.progressNote.textContent =
      "Completaste las tres lecciones. ¡Qué lindo avance!";
  } else if (completedCount > 0) {
    els.progressNote.textContent =
      "Ya diste los primeros pasos. Seguí cuando tengas un ratito.";
  } else {
    els.progressNote.textContent =
      "Elegí una lección y empezá a practicar.";
  }
}

function renderLesson() {
  const lesson = getCurrentLesson();
  const lessonIndex = lessons.findIndex((item) => item.id === lesson.id);

  els.lessonLevel.textContent = lesson.level;
  els.practiceTitle.textContent = lesson.title;
  els.lessonCounter.innerHTML = `${lessonIndex + 1} <span>/ ${lessons.length}</span>`;

  els.lessonTabs.forEach((tab) => {
    const selected = tab.dataset.lesson === lesson.id;

    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });

  resetCurrentLesson(false);
}

function resetStats() {
  els.timeStat.textContent = "00:00";
  els.accuracyStat.textContent = "—";
  els.speedStat.textContent = "—";
  els.errorsStat.textContent = "0";
}

function resetCurrentLesson(focus = true) {
  window.clearInterval(timerId);

  timerId = null;
  isRunning = false;
  startedAt = null;
  elapsedSeconds = 0;

  els.typingInput.value = "";
  els.typingInput.disabled = true;
  els.startButton.disabled = false;
  els.startButton.innerHTML =
    'Comenzar práctica <span aria-hidden="true">↵</span>';

  els.promptStatus.textContent = "Lista para empezar";
  els.coachMessage.textContent =
    "Cuando estés lista, apoyá los dedos y dejá que la frase te guíe.";

  els.nextLesson.classList.add("is-hidden");

  resetStats();
  renderPrompt();

  if (focus) {
    els.startButton.focus();
  }
}

function startPractice() {
  window.clearInterval(timerId);

  isRunning = true;
  startedAt = Date.now();
  elapsedSeconds = 0;

  els.typingInput.value = "";
  els.typingInput.disabled = false;
  els.typingInput.focus();

  els.startButton.innerHTML =
    'Reiniciar <span aria-hidden="true">↻</span>';

  els.promptStatus.textContent = "En curso";
  els.coachMessage.textContent =
    "Muy bien. Buscá suavidad, no velocidad.";

  els.nextLesson.classList.add("is-hidden");

  timerId = window.setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);

    els.timeStat.textContent = formatTime(elapsedSeconds);
    updateLiveStats();
  }, 250);

  renderPrompt();
}

function updateLiveStats() {
  const lesson = getCurrentLesson();
  const stats = getStats(
    els.typingInput.value,
    lesson.prompt,
    elapsedSeconds
  );

  els.timeStat.textContent = formatTime(elapsedSeconds);
  els.accuracyStat.textContent = els.typingInput.value
    ? `${stats.accuracy}%`
    : "—";
  els.speedStat.textContent = els.typingInput.value
    ? `${stats.wpm}`
    : "—";
  els.errorsStat.textContent = String(stats.errors);
}

function handleTyping() {
  if (!isRunning) return;

  const value = els.typingInput.value;
  const prompt = getCurrentLesson().prompt;

  updateLiveStats();
  renderPrompt(value);

  if (value === prompt) {
    finishLesson();
  }
}

function finishLesson() {
  window.clearInterval(timerId);

  timerId = null;
  isRunning = false;

  const lesson = getCurrentLesson();
  const stats = getStats(
    els.typingInput.value,
    lesson.prompt,
    elapsedSeconds
  );

  const firstCompletion = !progress.completedLessons.includes(lesson.id);

  if (firstCompletion) {
    progress.completedLessons.push(lesson.id);
    progress.completed += 1;
  }

  progress.bestWpm = Math.max(progress.bestWpm, stats.wpm);
  progress.bestAccuracy = Math.max(progress.bestAccuracy, stats.accuracy);

  saveProgress();
  updateProgressUI();

  els.typingInput.disabled = true;
  els.startButton.innerHTML =
    'Volver a practicar <span aria-hidden="true">↻</span>';

  els.promptStatus.textContent = "¡Lección completa!";

  els.coachMessage.textContent =
    stats.accuracy >= 95
      ? "¡Excelente precisión! Tus manos ya están encontrando el camino."
      : "¡Lo lograste! Repetirla una vez más puede hacerla todavía más cómoda.";

  els.nextLesson.classList.toggle(
    "is-hidden",
    lessons.findIndex((item) => item.id === lesson.id) === lessons.length - 1
  );

  renderPrompt(els.typingInput.value);
}

function selectLesson(id) {
  if (!lessons.some((lesson) => lesson.id === id)) return;

  currentLessonId = id;
  renderLesson();
}

function handleKeyDown(event) {
  let key = event.key.toLowerCase();

  if (key === " ") key = "space";
  if (key === "dead") key = "´";

  els.keys.forEach((element) => {
    element.classList.toggle("is-pressed", element.dataset.key === key);
  });
}

function clearPressedKeys() {
  els.keys.forEach((element) => {
    element.classList.remove("is-pressed");
  });
}

function nextLesson() {
  const currentIndex = lessons.findIndex(
    (lesson) => lesson.id === currentLessonId
  );

  const next = lessons[(currentIndex + 1) % lessons.length];

  selectLesson(next.id);
  startPractice();
}

function resetAllProgress() {
  const shouldReset = window.confirm(
    "¿Querés borrar el progreso guardado en este dispositivo?"
  );

  if (!shouldReset) return;

  progress = {
    completed: 0,
    bestWpm: 0,
    bestAccuracy: 0,
    completedLessons: [],
  };

  saveProgress();
  updateProgressUI();
  resetCurrentLesson();
}

function registerWebMcpTools() {
  const modelContext = document.modelContext;

  if (!modelContext?.registerTool) return;

  const lifecycle = new AbortController();

  const register = (tool) => {
    try {
      Promise.resolve(
        modelContext.registerTool(tool, {
          signal: lifecycle.signal,
        })
      ).catch(() => {});
    } catch (error) {
      // Older browsers simply skip WebMCP support.
    }
  };

  register({
    name: "get_typing_progress",
    title: "Consultar progreso",
    description:
      "Devuelve el progreso guardado y las mejores métricas del entrenamiento de Tecla a Tecla.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      untrustedContentHint: false,
    },
    execute() {
      return {
        completed: progress.completed,
        completedLessons: [...progress.completedLessons],
        bestWpm: progress.bestWpm,
        bestAccuracy: progress.bestAccuracy,
      };
    },
  });

  register({
    name: "start_typing_lesson",
    title: "Empezar una lección",
    description:
      "Selecciona una lección de teclado y deja lista la práctica visible para comenzar.",
    inputSchema: {
      type: "object",
      properties: {
        lessonId: {
          type: "string",
          enum: lessons.map((lesson) => lesson.id),
        },
      },
      required: ["lessonId"],
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: false,
    },
    execute(input) {
      if (!lessons.some((lesson) => lesson.id === input?.lessonId)) {
        throw new Error("Lección no encontrada");
      }

      selectLesson(input.lessonId);
      startPractice();

      return {
        lessonId: input.lessonId,
        status: "ready",
      };
    },
  });

  register({
    name: "reset_typing_lesson",
    title: "Reiniciar la práctica",
    description:
      "Borra el texto de la ronda actual y deja la lección lista para empezar de nuevo.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: false,
      untrustedContentHint: false,
    },
    execute() {
      resetCurrentLesson(false);

      return {
        lessonId: currentLessonId,
        status: "reset",
      };
    },
  });
}

els.startButton.addEventListener("click", () =>
  isRunning ? resetCurrentLesson() : startPractice()
);

els.typingInput.addEventListener("input", handleTyping);
els.typingInput.addEventListener("keydown", handleKeyDown);
els.typingInput.addEventListener("keyup", clearPressedKeys);
els.typingInput.addEventListener("blur", clearPressedKeys);

els.lessonTabs.forEach((tab) =>
  tab.addEventListener("click", () => selectLesson(tab.dataset.lesson))
);

els.nextLesson.addEventListener("click", nextLesson);
els.resetProgress.addEventListener("click", resetAllProgress);

updateProgressUI();
renderLesson();
registerWebMcpTools();
