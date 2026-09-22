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
 * Flip this to 'google/nano-banana' if v2 gives trouble — the two take the same
 * inputs, so nothing else in this file needs to change.
 */
const MODEL = 'google/nano-banana-2';

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
        output_format: 'png',
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
