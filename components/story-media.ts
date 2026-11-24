export async function fetchStoryAsset(url: string, signal: AbortSignal) {
  const response = await fetch(url, { cache: "force-cache", signal });
  if (!response.ok) throw new Error(`Could not load ${url} (${response.status})`);
  return response;
}

export async function prepareStoryVideo(
  url: string,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
) {
  const response = await fetchStoryAsset(url, signal);
  const totalBytes = Number(response.headers.get("content-length"));
  let download = response;

  if (response.body && totalBytes > 0 && typeof TransformStream !== "undefined") {
    let receivedBytes = 0;
    let reportedPercent = 0;
    const stream = response.body.pipeThrough(new TransformStream({
      transform(chunk, controller) {
        receivedBytes += chunk.byteLength;
        const percent = Math.min(99, Math.floor((receivedBytes / totalBytes) * 100));
        if (percent > reportedPercent) {
          reportedPercent = percent;
          onProgress(percent / 100);
        }
        controller.enqueue(chunk);
      },
    }));
    download = new Response(stream, {
      headers: { "Content-Type": response.headers.get("content-type") || "video/mp4" },
    });
  }

  const blob = await download.blob();
  if (signal.aborted) throw signal.reason;
  onProgress(1);
  return URL.createObjectURL(blob);
}
