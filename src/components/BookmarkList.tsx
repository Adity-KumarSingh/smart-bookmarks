"use client";

import { createClient } from "@/lib/supabase/client";
import { Bookmark } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";
import BookmarkCard from "./BookmarkCard";
import { Bookmark as BookmarkIcon, Search } from "lucide-react";

interface BookmarkListProps {
  userId: string;
  initialBookmarks: Bookmark[];
}

export default function BookmarkList({
  userId,
  initialBookmarks,
}: BookmarkListProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initialBookmarks);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

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
          setBookmarks((prev) => {
            if (prev.some((b) => b.id === payload.new.id)) return prev;
            return [payload.new as Bookmark, ...prev];
          });
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
          setBookmarks((prev) =>
            prev.filter((b) => b.id !== payload.old.id)
          );
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
          setBookmarks((prev) =>
            prev.map((b) =>
              b.id === payload.new.id ? (payload.new as Bookmark) : b
            )
          );
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const handleDelete = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (data) setBookmarks(data);
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
