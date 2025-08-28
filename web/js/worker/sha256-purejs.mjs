import { Sha256 } from '@aws-crypto/sha256-js';

const calculateSHA256 = function(text) {
  const hash = new Sha256();
  hash.update(text);
  return hash.digest();
};

function toHexString(arr) {
  return Array.from(arr)
    .map(function(c) {
      return c.toString(16).padStart(2, "0");
    })
    .join("");
}

addEventListener('message', async function(event) {
  const eventData = event.data;
  const data = eventData.data;
  const difficulty = eventData.difficulty;
  const threads = eventData.threads;
  let nonce = eventData.nonce;
  const isMainThread = nonce === 0;
  let iterations = 0;

  const requiredZeroBytes = Math.floor(difficulty / 2);
  const isDifficultyOdd = difficulty % 2 !== 0;

  for (; ;) {
    const hashBuffer = await calculateSHA256(data + nonce);
    const hashArray = new Uint8Array(hashBuffer);

    let isValid = true;
    for (let i = 0; i < requiredZeroBytes; i++) {
      if (hashArray[i] !== 0) {
        isValid = false;
        break;
      }
    }

    if (isValid && isDifficultyOdd) {
      if ((hashArray[requiredZeroBytes] >> 4) !== 0) {
        isValid = false;
      }
    }

    if (isValid) {
      const finalHash = toHexString(hashArray);
      postMessage({
        hash: finalHash,
        data: data,
        difficulty: difficulty,
        nonce: nonce,
      });
      return; // Exit worker
    }

    nonce += threads;
    iterations++;

    // Send a progress update from the main thread every 1024 iterations.
    if (isMainThread && (iterations & 1023) === 0) {
      postMessage(nonce);
    }
  }
});