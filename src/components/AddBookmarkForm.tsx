"use client";

import { createClient } from "@/lib/supabase/client";
import { UrlMetadata } from "@/lib/types";
import { Globe, Loader2, Plus, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface AddBookmarkFormProps {
  userId: string;
}

export default function AddBookmarkForm({ userId }: AddBookmarkFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [metadataFetched, setMetadataFetched] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isOpen) urlInputRef.current?.focus();
  }, [isOpen]);

  const isValidUrl = (str: string) => {
    try {
      const u = new URL(str.startsWith("http") ? str : `https://${str}`);
      return u.hostname.includes(".");
    } catch {
      return false;
    }
  };

  const normalizeUrl = (str: string) => {
    if (!str.startsWith("http://") && !str.startsWith("https://")) {
      return `https://${str}`;
    }
    return str;
  };

  const fetchMetadata = useCallback(async (rawUrl: string) => {
    const normalizedUrl = normalizeUrl(rawUrl);
    if (!isValidUrl(normalizedUrl)) return;

    setFetching(true);
    try {
      const res = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (res.ok) {
        const data: UrlMetadata = await res.json();
        setTitle((prev) => prev || data.title || "");
        setDescription(data.description || "");
        setFaviconUrl(data.favicon_url || "");
        setMetadataFetched(true);
      }
    } catch {
    } finally {
      setFetching(false);
    }
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    setError("");
    setMetadataFetched(false);

    if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    if (value.length > 5 && isValidUrl(normalizeUrl(value))) {
      fetchTimeoutRef.current = setTimeout(() => fetchMetadata(value), 600);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const normalizedUrl = normalizeUrl(url);

    if (!isValidUrl(normalizedUrl)) {
      setError("Please enter a valid URL");
      return;
    }

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const { error: insertError } = await supabase.from("bookmarks").insert({
        user_id: userId,
        url: normalizedUrl,
        title: title.trim(),
        description: description.trim() || null,
        favicon_url: faviconUrl || null,
      });

      if (insertError) throw insertError;

      setUrl("");
      setTitle("");
      setDescription("");
      setFaviconUrl("");
      setMetadataFetched(false);
      setIsOpen(false);
    } catch {
      setError("Failed to save bookmark. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setUrl("");
    setTitle("");
    setDescription("");
    setFaviconUrl("");
    setError("");
    setMetadataFetched(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed border-stone-200 text-muted hover:border-primary hover:text-primary transition-all duration-200 cursor-pointer bg-white hover:bg-primary/5"
      >
        <Plus className="w-4.5 h-4.5" />
        <span className="text-sm font-medium">Add Bookmark</span>
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-card-border p-5 shadow-sm animate-slide-up"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground text-sm">
          New Bookmark
        </h3>
        <button
          type="button"
          onClick={handleCancel}
          className="text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="url"
            className="block text-xs font-medium text-muted mb-1.5"
          >
            URL
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              ref={urlInputRef}
              id="url"
              type="text"
              value={url}
              onChange={handleUrlChange}
              placeholder="https://example.com"
              className="w-full h-10 pl-9 pr-10 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              autoComplete="off"
            />
            {fetching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted animate-spin" />
            )}
            {metadataFetched && !fetching && (
              <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="title"
            className="block text-xs font-medium text-muted mb-1.5"
          >
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            placeholder={fetching ? "Fetching title..." : "Bookmark title"}
            className="w-full h-10 px-3 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-xs font-medium text-muted mb-1.5"
          >
            Description{" "}
            <span className="text-stone-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description"
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
          />
        </div>

        {faviconUrl && title && (
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-accent border border-card-border">
            <img
              src={faviconUrl}
              alt=""
              className="w-5 h-5 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <span className="text-xs text-muted truncate">{title}</span>
          </div>
        )}

        {error && <p className="text-xs text-danger">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving || !url || !title}
            className="flex-1 flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {saving ? "Saving..." : "Save Bookmark"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 h-10 rounded-lg border border-stone-200 text-sm text-muted hover:text-foreground hover:bg-accent transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </form>
  );
}
