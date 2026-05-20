"use client";

import { createClient } from "@/lib/supabase/client";
import { Bookmark } from "@/lib/types";
import { useCallback, useEffect, useRef, useState } from "react";
import BookmarkCard from "./BookmarkCard";
import { Bookmark as BookmarkIcon, Search } from "lucide-react";
import AddBookmarkForm from "./AddBookmarkForm";

interface BookmarkListProps {
  userId: string;
  initialBookmarks: Bookmark[];
}

const BOOKMARKS_SYNC_CHANNEL = "smart-bookmarks-sync";
const BOOKMARKS_SYNC_STORAGE_KEY = "smart-bookmarks-sync-event";

type BookmarkSyncEvent =
  | { type: "added"; userId: string; bookmark: Bookmark }
  | { type: "updated"; userId: string; bookmark: Bookmark }
  | { type: "deleted"; userId: string; bookmarkId: string };

export default function BookmarkList({
  userId,
  initialBookmarks,
}: BookmarkListProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const syncChannelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    setBookmarks(initialBookmarks);
  }, [initialBookmarks]);

  const addBookmarkToState = useCallback((bookmark: Bookmark) => {
    setBookmarks((prev) => {
      if (prev.some((b) => b.id === bookmark.id)) return prev;
      return [bookmark, ...prev];
    });
  }, []);

  const updateBookmarkInState = useCallback((bookmark: Bookmark) => {
    setBookmarks((prev) =>
      prev.map((b) => (b.id === bookmark.id ? bookmark : b))
    );
  }, []);

  const removeBookmarkFromState = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const fetchBookmarks = useCallback(async () => {
    const supabase = createClient();

    try {
      const response = await fetch("/api/bookmarks", {
        cache: "no-store",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!response.ok) return;

      const data: { bookmarks?: Bookmark[] } = await response.json();
      setBookmarks(data.bookmarks || []);
      return;
    } catch {
    }

    const { data } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) setBookmarks(data as Bookmark[]);
  }, [userId]);

  const applySyncEvent = useCallback(
    (event: BookmarkSyncEvent) => {
      if (event.userId !== userId) return;

      if (event.type === "added") addBookmarkToState(event.bookmark);
      if (event.type === "updated") updateBookmarkInState(event.bookmark);
      if (event.type === "deleted") removeBookmarkFromState(event.bookmarkId);
    },
    [addBookmarkToState, removeBookmarkFromState, updateBookmarkInState, userId]
  );

  const broadcastSyncEvent = useCallback((event: BookmarkSyncEvent) => {
    syncChannelRef.current?.postMessage(event);

    try {
      localStorage.setItem(
        BOOKMARKS_SYNC_STORAGE_KEY,
        JSON.stringify({ ...event, emittedAt: Date.now() })
      );
    } catch {
      // Cross-tab sync is a fallback; Supabase realtime still handles remote updates.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("BroadcastChannel" in window) {
      syncChannelRef.current = new BroadcastChannel(BOOKMARKS_SYNC_CHANNEL);
      syncChannelRef.current.onmessage = (event) => {
        applySyncEvent(event.data as BookmarkSyncEvent);
      };
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== BOOKMARKS_SYNC_STORAGE_KEY || !event.newValue) return;

      try {
        applySyncEvent(JSON.parse(event.newValue) as BookmarkSyncEvent);
      } catch {
        return;
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
      syncChannelRef.current?.close();
      syncChannelRef.current = null;
    };
  }, [applySyncEvent]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    void fetchBookmarks();

    const handleFocus = () => {
      void fetchBookmarks();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void fetchBookmarks();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchBookmarks]);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("bookmarks-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          addBookmarkToState(payload.new as Bookmark);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.old.id) removeBookmarkFromState(payload.old.id as string);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bookmarks",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          updateBookmarkInState(payload.new as Bookmark);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [
    addBookmarkToState,
    removeBookmarkFromState,
    updateBookmarkInState,
    userId,
  ]);

  const handleBookmarkAdded = useCallback((bookmark: Bookmark) => {
    addBookmarkToState(bookmark);
    broadcastSyncEvent({ type: "added", userId, bookmark });
  }, [addBookmarkToState, broadcastSyncEvent, userId]);

  const handleDelete = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (error) throw error;

      removeBookmarkFromState(id);
      broadcastSyncEvent({ type: "deleted", userId, bookmarkId: id });
    } catch {
      await fetchBookmarks();
    } finally {
      setLoading(false);
    }
  }, [
    broadcastSyncEvent,
    fetchBookmarks,
    removeBookmarkFromState,
    userId,
  ]);

  const filtered = search
    ? bookmarks.filter(
        (b) =>
          b.title.toLowerCase().includes(search.toLowerCase()) ||
          b.url.toLowerCase().includes(search.toLowerCase()) ||
          b.description?.toLowerCase().includes(search.toLowerCase())
      )
    : bookmarks;

  return (
    <div>
      <div className="mb-6">
        <AddBookmarkForm
          userId={userId}
          onBookmarkAdded={handleBookmarkAdded}
        />
      </div>

      {bookmarks.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bookmarks..."
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
      )}

      {bookmarks.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-muted">
            {filtered.length} bookmark{filtered.length !== 1 ? "s" : ""}
            {search && ` matching "${search}"`}
          </p>
          {loading && (
            <div className="w-4 h-4 border-2 border-stone-200 border-t-primary rounded-full animate-spin" />
          )}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="space-y-2.5">
          {filtered.map((bookmark) => (
            <BookmarkCard
              key={bookmark.id}
              bookmark={bookmark}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : bookmarks.length > 0 && search ? (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-muted text-sm">
            No bookmarks match &ldquo;{search}&rdquo;
          </p>
          <button
            onClick={() => setSearch("")}
            className="text-primary text-sm mt-2 hover:underline cursor-pointer"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="text-center py-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-stone-100 mb-4">
            <BookmarkIcon className="w-7 h-7 text-stone-400" />
          </div>
          <h3 className="font-medium text-foreground mb-1">
            No bookmarks yet
          </h3>
          <p className="text-sm text-muted max-w-xs mx-auto">
            Add your first bookmark above. Paste a URL and we&apos;ll
            automatically fetch the title and favicon.
          </p>
        </div>
      )}
    </div>
  );
}
