import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const FAV_KEY = "music-finder-favs-v1";

function loadFavs() {
  try {
    const raw = localStorage.getItem(FAV_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavs(favs) {
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

export default function App() {
  const [query, setQuery] = useState("Drake");
  const [status, setStatus] = useState("Type a search and press Enter.");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const [favs, setFavs] = useState(loadFavs);
  const [filter, setFilter] = useState("all"); // all | favs

  const audioRef = useRef(null);
  const [playingUrl, setPlayingUrl] = useState(null);

  useEffect(() => {
    saveFavs(favs);
  }, [favs]);

  useEffect(() => {
    // initial search
    searchItunes("Drake");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    if (filter === "favs") {
      const favSet = new Set(favs.map((f) => f.trackId));
      return results.filter((r) => favSet.has(r.trackId));
    }
    return results;
  }, [results, favs, filter]);

  async function searchItunes(q) {
    const term = q.trim();
    if (!term) return;

    setLoading(true);
    setStatus("Searching...");
    setPlayingUrl(null);

    try {
      // iTunes Search API (no key)
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
        term
      )}&entity=song&limit=25`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      const data = await res.json();

      setResults(data.results || []);
      setStatus(
        (data.results?.length ?? 0) > 0
          ? `Showing results for "${term}".`
          : `No results for "${term}". Try another search.`
      );
    } catch {
      setStatus("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function isFav(item) {
    return favs.some((f) => f.trackId === item.trackId);
  }

  function toggleFav(item) {
    setFavs((prev) => {
      if (prev.some((f) => f.trackId === item.trackId)) {
        return prev.filter((f) => f.trackId !== item.trackId);
      }
      return [
        {
          trackId: item.trackId,
          trackName: item.trackName,
          artistName: item.artistName,
          collectionName: item.collectionName,
          artworkUrl100: item.artworkUrl100,
          previewUrl: item.previewUrl,
        },
        ...prev,
      ];
    });
  }

  function playPreview(url) {
    if (!url) return;

    // Stop if same
    if (playingUrl === url) {
      audioRef.current?.pause();
      setPlayingUrl(null);
      return;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.addEventListener("ended", () => setPlayingUrl(null));
    } else {
      audioRef.current.pause();
      audioRef.current.src = url;
    }

    audioRef.current.play();
    setPlayingUrl(url);
  }

  function stopAudio() {
    audioRef.current?.pause();
    setPlayingUrl(null);
  }

  return (
    <div className="page">
      <div className="card">
        <header className="header">
          <div>
            <h1>Music Finder 🎧</h1>
            <p className="muted">Search songs and preview tracks (iTunes API).</p>
          </div>

          <div className="seg">
            <button
              className={filter === "all" ? "segBtn active" : "segBtn"}
              onClick={() => setFilter("all")}
              type="button"
            >
              All
            </button>
            <button
              className={filter === "favs" ? "segBtn active" : "segBtn"}
              onClick={() => setFilter("favs")}
              type="button"
            >
              Favourites ({favs.length})
            </button>
          </div>
        </header>

        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            stopAudio();
            searchItunes(query);
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artist or song (e.g., Drake, Oasis, Fred again...)"
          />
          <button disabled={loading} type="submit">
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        <p className="status">{status}</p>

        <div className="grid">
          {visible.map((item) => (
            <div key={item.trackId} className="tile">
              <img
                className="art"
                src={item.artworkUrl100}
                alt={`${item.trackName} artwork`}
                loading="lazy"
              />

              <div className="info">
                <div className="track">{item.trackName}</div>
                <div className="artist">{item.artistName}</div>
                <div className="album muted">{item.collectionName}</div>
              </div>

              <div className="actions">
                <button
                  type="button"
                  className={playingUrl === item.previewUrl ? "btn active" : "btn"}
                  onClick={() => playPreview(item.previewUrl)}
                  disabled={!item.previewUrl}
                  title={!item.previewUrl ? "No preview available" : "Play preview"}
                >
                  {playingUrl === item.previewUrl ? "Pause" : "Play"}
                </button>

                <button
                  type="button"
                  className={isFav(item) ? "btn fav active" : "btn fav"}
                  onClick={() => toggleFav(item)}
                  title="Toggle favourite"
                >
                  {isFav(item) ? "★" : "☆"}
                </button>
              </div>
            </div>
          ))}
        </div>

        <footer className="footer muted">
          Tip: search “Oasis”, “The Weeknd”, “Calvin Harris”… then favourite tracks.
        </footer>
      </div>
    </div>
  );
}
