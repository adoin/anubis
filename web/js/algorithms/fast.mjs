export default function process(
  config,
  data,
  difficulty = 5,
  signal = null,
  progressCallback = null,
  threads = Math.max((navigator.hardwareConcurrency || 0) / 2, 1),
) {
  const basePrefix = config.basePrefix;
  const version = config.version;
  console.debug("fast algo");

  // let workerMethod = window.crypto !== undefined ? "webcrypto" : "purejs";
  let workerMethod = "purejs";

  if (navigator.userAgent.includes("Firefox") || navigator.userAgent.includes("Goanna")) {
    console.log("Firefox detected, using pure-JS fallback");
    workerMethod = "purejs";
  }

  return new Promise(function(resolve, reject) {
    let webWorkerURL = `${basePrefix}/.within.website/x/cmd/anubis/static/js/worker/sha256-${workerMethod}.js?cacheBuster=${version}`;

    console.log(webWorkerURL);

    const workers = [];
    let settled = false;

    const cleanup = function() {
      if (settled) {
        return;
      }
      settled = true;
      workers.forEach(function(w) {
        w.terminate();
      });
      if (signal != null) {
        signal.removeEventListener("abort", onAbort);
      }
    };

    const onAbort = function() {
      console.log("PoW aborted");
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (signal != null) {
      if (signal.aborted) {
        return onAbort();
      }
      signal.addEventListener("abort", onAbort, { once: true });
    }

    for (let i = 0; i < threads; i++) {
      let worker = new Worker(webWorkerURL);

      worker.onmessage = function(event) {
        if (typeof event.data === "number") {
          progressCallback?.(event.data);
        } else {
          cleanup();
          resolve(event.data);
        }
      };

      worker.onerror = function(event) {
        cleanup();
        reject(event);
      };

      worker.postMessage({
        data: data,
        difficulty: difficulty,
        nonce: i,
        threads: threads,
      });

      workers.push(worker);
    }
  });
}