/**
 * Talks to the ITP/IMA Replicate proxy.
 *
 * The proxy is the school's stand-in for a paid Replicate account — it holds the
 * real API key on its own server, so we never need one here. That is why the
 * Authorization token below is an empty string: the header has to be present,
 * but the proxy fills in the actual credential before passing our request on.
 */

const PROXY_URL = 'https://itp-ima-replicate-proxy.web.app/api/create_n_get';

/**
 * v1, not v2: through the proxy v1 answers in about half the time (~7s vs ~14s
 * for a text-only test on 2026-11-17). The two take the same inputs, so switch
 * back to 'google/nano-banana-2' here if you prefer its look.
 */
const MODEL = 'google/nano-banana';

/**
 * Almost all of the tuning happens right here. If Pingu's pose doesn't match, or
 * he looks wrong, edit this string — not the code below it.
 */
const PINGU_PROMPT = [
  'Redraw the person in this photo as Pingu, the claymation penguin:',
  'small, rounded black body, white oval belly, orange beak and orange feet.',
  'Keep the exact same pose — same arm and hand positions, same head tilt,',
  'same facial expression, same camera angle and framing.',
  'Claymation style, soft studio lighting, simple plain background.',
].join(' ');

/**
 * Sends the captured photo to the model and returns the URL of the Pingu image.
 *
 * Takes a few seconds — the caller is expected to show something in the meantime.
 */
export async function generatePingu(imageDataUrl: string): Promise<string> {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ',
    },
    body: JSON.stringify({
      model: MODEL,
      input: {
        prompt: PINGU_PROMPT,
        // An array even though we only ever send one picture — the model accepts
        // several images for blending, and expects this shape either way.
        // The base64 string from toDataURL() goes in directly; the proxy swaps it
        // for a temporary hosted URL, which is what the model actually wants.
        image_input: [imageDataUrl],
        output_format: 'jpg',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Proxy returned ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  // nano-banana hands back a single URL string. Plenty of other Replicate models
  // return an array instead, so accept both rather than breaking on the day you
  // swap models.
  const output = Array.isArray(result.output) ? result.output[0] : result.output;

  if (typeof output !== 'string' || output.length === 0) {
    throw new Error(result.error ?? 'The model returned no image');
  }

  return output;
}

/**
 * Fetches the generated Pingu and re-encodes it as a small JPEG data URL, so it
 * can be stored in Firestore directly.
 *
 * The model's URL stops working within the hour, so it can't be what the shared
 * strip keeps. 640px at 0.85 lands well under the 900 KB the rules allow.
 */
export async function toCompactDataUrl(url: string, maxSize = 640): Promise<string> {
  const response = await fetch(url);
  const bitmap = await createImageBitmap(await response.blob());

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Saves an image to the user's computer.
 *
 * A plain <a download> quietly ignores the download attribute when the file
 * lives on another domain — it navigates to the image instead. So fetch the
 * bytes ourselves and hand the browser a local blob, which it will always save.
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(objectUrl);
}
