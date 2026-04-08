"use client";

import { Bookmark } from "@/lib/types";
import { ExternalLink, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onDelete: (id: string) => void;
}

export default function BookmarkCard({ bookmark, onDelete }: BookmarkCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [faviconError, setFaviconError] = useState(false);

  const hostname = (() => {
    try {
      return new URL(bookmark.url).hostname.replace("www.", "");
    } catch {
      return bookmark.url;
    }
  })();

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(bookmark.id);
  };

  const timeAgo = formatDistanceToNow(new Date(bookmark.created_at), {
    addSuffix: true,
  });

  return (
    <div className="group relative bg-white rounded-xl border border-card-border p-4 hover:shadow-md hover:border-stone-300 transition-all duration-200 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent border border-card-border flex items-center justify-center overflow-hidden">
          {bookmark.favicon_url && !faviconError ? (
            <img
              src={bookmark.favicon_url}
              alt=""
              className="w-6 h-6"
              onError={() => setFaviconError(true)}
            />
          ) : (
            <span className="text-xs font-semibold text-muted">
              {hostname.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group/link inline-flex items-center gap-1.5 max-w-full"
          >
            <h3 className="font-medium text-sm text-foreground truncate group-hover/link:text-primary transition-colors">
              {bookmark.title}
            </h3>
            <ExternalLink className="w-3 h-3 text-muted opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0" />
          </a>

          <p className="text-xs text-muted mt-0.5 truncate">{hostname}</p>

          {bookmark.description && (
            <p className="text-xs text-muted mt-1.5 line-clamp-2 leading-relaxed">
              {bookmark.description}
            </p>
          )}

          <p className="text-[11px] text-stone-400 mt-2">{timeAgo}</p>
        </div>

        <div className="flex-shrink-0">
          {showConfirm ? (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs px-2.5 py-1.5 rounded-md bg-danger text-white hover:bg-danger-hover transition-colors cursor-pointer disabled:opacity-50"
              >
                {deleting ? "..." : "Delete"}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="text-xs px-2.5 py-1.5 rounded-md border border-stone-200 text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-muted hover:text-danger hover:bg-red-50 transition-all cursor-pointer"
              title="Delete bookmark"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
