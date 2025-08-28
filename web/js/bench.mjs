// AbortController polyfill for older Android WebView versions
if (typeof AbortController === 'undefined') {
  // DOMException polyfill for older browsers
  if (typeof DOMException === 'undefined') {
    window.DOMException = class DOMException extends Error {
      constructor(message, name) {
        super(message);
        this.name = name;
        this.message = message;
      }
    };
  }
  
  window.AbortSignal = class AbortSignal {
    constructor() {
      this.aborted = false;
      this.onabort = null;
      this._listeners = [];
    }
    
    addEventListener(type, listener, options = {}) {
      if (type === 'abort') {
        this._listeners.push({ listener, once: options.once || false });
      }
    }
    
    removeEventListener(type, listener) {
      if (type === 'abort') {
        this._listeners = this._listeners.filter(item => item.listener !== listener);
      }
    }
    
    _triggerAbort() {
      this.aborted = true;
      if (this.onabort) {
        this.onabort();
      }
      
      // Trigger all listeners
      const listenersToCall = [...this._listeners];
      this._listeners = this._listeners.filter(item => !item.once);
      
      listenersToCall.forEach(item => {
        try {
          item.listener();
        } catch (e) {
          console.error('Error in abort listener:', e);
        }
      });
    }
  };
  
  window.AbortController = class AbortController {
    constructor() {
      this.signal = new AbortSignal();
    }
    
    abort() {
      this.signal._triggerAbort();
    }
  };
}

import algorithms from "./algorithms/index.mjs";

const defaultDifficulty = 4;

const status = document.getElementById("status");
const difficultyInput = document.getElementById("difficulty-input");
const algorithmSelect = document.getElementById("algorithm-select");
const compareSelect = document.getElementById("compare-select");
const header = document.getElementById("table-header");
const headerCompare = document.getElementById("table-header-compare");
const results = document.getElementById("results");

const setupControls = () => {
  difficultyInput.value = defaultDifficulty;
  for (const alg of Object.keys(algorithms)) {
    const option1 = document.createElement("option");
    algorithmSelect.append(option1);
    const option2 = document.createElement("option");
    compareSelect.append(option2);
    option1.value = option1.innerText = option2.value = option2.innerText = alg;
  }
};

const benchmarkTrial = async (stats, difficulty, algorithm, signal) => {
  if (!(difficulty >= 1)) {
    throw new Error(`Invalid difficulty: ${difficulty}`);
  }
  const process = algorithms[algorithm];
  if (process == null) {
    throw new Error(`Unknown algorithm: ${algorithm}`);
  }

  const rawChallenge = new Uint8Array(32);
  crypto.getRandomValues(rawChallenge);
  const challenge = Array.from(rawChallenge)
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("");

  const t0 = performance.now();
  const { hash, nonce } = await process({ basePrefix: "/", version: "devel" }, challenge, Number(difficulty), signal);
  const t1 = performance.now();
  console.log({ hash, nonce });

  stats.time += t1 - t0;
  stats.iters += nonce;

  return { time: t1 - t0, nonce };
};

const stats = { time: 0, iters: 0 };
const comparison = { time: 0, iters: 0 };
const updateStatus = () => {
  const mainRate = stats.iters / stats.time;
  const compareRate = comparison.iters / comparison.time;
  if (Number.isFinite(mainRate)) {
    status.innerText = `Average hashrate: ${mainRate.toFixed(3)}kH/s`;
    if (Number.isFinite(compareRate)) {
      const change = ((mainRate - compareRate) / mainRate) * 100;
      status.innerText += ` vs ${compareRate.toFixed(3)}kH/s (${change.toFixed(2)}% change)`;
    }
  } else {
    status.innerText = "Benchmarking...";
  }
};

const tableCell = (text) => {
  const td = document.createElement("td");
  td.innerText = text;
  td.style.padding = "0 0.25rem";
  return td;
};

const benchmarkLoop = async (controller) => {
  const difficulty = difficultyInput.value;
  const algorithm = algorithmSelect.value;
  const compareAlgorithm = compareSelect.value;
  updateStatus();

  try {
    const { time, nonce } = await benchmarkTrial(
      stats,
      difficulty,
      algorithm,
      controller.signal,
    );

    const tr = document.createElement("tr");
    tr.style.display = "contents";
    tr.append(tableCell(`${time}ms`), tableCell(nonce));

    // auto-scroll to new rows
    const atBottom =
      results.scrollHeight - results.clientHeight <= results.scrollTop;
    results.append(tr);
    if (atBottom) {
      results.scrollTop = results.scrollHeight - results.clientHeight;
    }
    updateStatus();

    if (compareAlgorithm !== "NONE") {
      const { time, nonce } = await benchmarkTrial(
        comparison,
        difficulty,
        compareAlgorithm,
        controller.signal,
      );
      tr.append(tableCell(`${time}ms`), tableCell(nonce));
    }
  } catch (e) {
    if (e !== false) {
      status.innerText = e;
    }
    return;
  }

  await benchmarkLoop(controller);
};

let controller = null;
const reset = () => {
  stats.time = stats.iters = 0;
  comparison.time = comparison.iters = 0;
  results.innerHTML = status.innerText = "";

  const table = results.parentElement;
  if (compareSelect.value !== "NONE") {
    table.style.gridTemplateColumns = "repeat(4,auto)";
    header.style.display = "none";
    headerCompare.style.display = "contents";
  } else {
    table.style.gridTemplateColumns = "repeat(2,auto)";
    header.style.display = "contents";
    headerCompare.style.display = "none";
  }

  if (controller != null) {
    controller.abort();
  }
  controller = new AbortController();
  void benchmarkLoop(controller);
};

setupControls();
difficultyInput.addEventListener("change", reset);
algorithmSelect.addEventListener("change", reset);
compareSelect.addEventListener("change", reset);
reset();
