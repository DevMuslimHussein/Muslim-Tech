import Link from "next/link";
import { notFound } from "next/navigation";
import { serverApiFetch } from "@/lib/server-api";
import { Badge } from "@/components/ui";
import { IconChevronLeft } from "@/components/icons";
import { VideoPlayer } from "./video-player";
import { BookmarkButton } from "./bookmark-button";
import { FileViewer } from "./file-viewer";
import { LectureNotes } from "./lecture-notes";

interface LectureFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  number: number;
  videoAssetId: string | null;
  files: LectureFile[];
  chapter: { id: string; title: string; subject: { id: string; name: string } };
}

export default async function LecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lecture = await serverApiFetch<Lecture>(`/lectures/${id}`);

  if (!lecture) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/subjects/${lecture.chapter.subject.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-ink-soft transition-colors hover:text-accent-ink"
      >
        <IconChevronLeft width={16} height={16} className="rotate-180" />
        {lecture.chapter.subject.name}
      </Link>

      {lecture.videoAssetId ? (
        <VideoPlayer lectureId={lecture.id} src={`/api/media/lectures/${lecture.id}/video`} />
      ) : (
        <div className="flex h-52 items-center justify-center rounded-lg border border-dashed border-border bg-surface-2 text-sm text-muted">
          لا يوجد فيديو لهذه المحاضرة
        </div>
      )}

      <div className="mt-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Badge tone="neutral">{lecture.chapter.title}</Badge>
          <h1 className="mt-2 text-lg font-semibold text-ink">{lecture.title}</h1>
        </div>
        <BookmarkButton lectureId={lecture.id} />
      </div>

      {lecture.description && (
        <p className="mt-3 text-sm/relaxed text-ink-soft">{lecture.description}</p>
      )}

      {lecture.files.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-ink">ملفات المحاضرة</h2>
          <FileViewer files={lecture.files} />
        </div>
      )}

      <LectureNotes lectureId={lecture.id} />
    </div>
  );
}
