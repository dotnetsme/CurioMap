import { BookshelfList } from "@/components/bookshelf/BookshelfList";

export default async function PublicBookshelfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex flex-col gap-4 py-4">
      <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Bookshelf</h1>
      <BookshelfList ownerId={id} />
    </div>
  );
}
