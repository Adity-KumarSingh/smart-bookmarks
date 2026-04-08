import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import AddBookmarkForm from "@/components/AddBookmarkForm";
import BookmarkList from "@/components/BookmarkList";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: bookmarks } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header
        user={{
          email: user.email,
          user_metadata: user.user_metadata as {
            full_name?: string;
            avatar_url?: string;
          },
        }}
      />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <AddBookmarkForm userId={user.id} />
        </div>

        <BookmarkList
          userId={user.id}
          initialBookmarks={bookmarks || []}
        />
      </main>
    </div>
  );
}
