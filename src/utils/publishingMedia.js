export function parsePublishingVideo(raw, title = "") {
  let url;
  try { url = new URL(raw); } catch { throw new Error("Enter a valid YouTube or Vimeo HTTPS link."); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) throw new Error("Use a secure YouTube or Vimeo link.");
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  let provider;
  let videoId;
  if (["youtube.com", "youtube-nocookie.com"].includes(host)) {
    provider = "youtube";
    videoId = url.pathname === "/watch" ? url.searchParams.get("v") : url.pathname.match(/^\/(?:embed|shorts)\/([A-Za-z0-9_-]{6,20})\/?$/)?.[1];
  } else if (host === "youtu.be") {
    provider = "youtube";
    videoId = url.pathname.match(/^\/([A-Za-z0-9_-]{6,20})\/?$/)?.[1];
  } else if (["vimeo.com", "player.vimeo.com"].includes(host)) {
    provider = "vimeo";
    videoId = url.pathname.match(host === "player.vimeo.com" ? /^\/video\/(\d+)\/?$/ : /^\/(\d+)\/?$/)?.[1];
  }
  if (!provider || !videoId || url.searchParams.has("v") && url.pathname !== "/watch") throw new Error("Use a valid YouTube or Vimeo video link.");
  return { provider, videoId, url: provider === "youtube" ? `https://www.youtube.com/watch?v=${videoId}` : `https://vimeo.com/${videoId}`, title: String(title).trim().slice(0, 180) };
}
