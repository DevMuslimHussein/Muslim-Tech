"use client";

import { useState } from "react";
import { Badge, ProgressBar } from "@/components/ui";
import { IconPlay, IconFile, IconTrash, IconUpload, IconCheck } from "@/components/icons";

interface LectureFile {
  id: string;
  fileName: string;
  isDownloadable: boolean;
}

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  number: number;
  status: "draft" | "scheduled" | "published";
  thumbnailUrl: string | null;
  videoAssetId: string | null;
  files: LectureFile[];
}

export interface ChapterOption {
  id: string;
  title: string;
  subjectName: string;
}

const statusMeta = {
  draft: { label: "مسودة", tone: "neutral" as const },
  scheduled: { label: "مجدولة", tone: "warning" as const },
  published: { label: "منشورة", tone: "success" as const },
};

export function LectureRow({
  lecture,
  onChanged,
  chapterId,
  chapterOptions,
}: {
  lecture: Lecture;
  onChanged: () => void;
  /** Current chapter id — pass together with chapterOptions to enable moving the lecture. */
  chapterId?: string;
  chapterOptions?: ChapterOption[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number | null>(null);

  async function publish() {
    setIsBusy(true);
    await fetch(`/api/proxy/admin/lectures/${lecture.id}/publish`, { method: "POST" });
    setIsBusy(false);
    onChanged();
  }

  async function removeLecture() {
    if (!confirm(`حذف محاضرة "${lecture.title}"؟`)) return;
    await fetch(`/api/proxy/admin/lectures/${lecture.id}`, { method: "DELETE" });
    onChanged();
  }

  async function moveToChapter(newChapterId: string) {
    setIsBusy(true);
    await fetch(`/api/proxy/admin/lectures/${lecture.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId: newChapterId }),
    });
    setIsBusy(false);
    onChanged();
  }

  /** XHR rather than fetch: only XHR exposes upload progress events. */
  function uploadWithProgress(endpoint: string, file: File) {
    return new Promise<void>((resolve, reject) => {
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint);
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          setUploadPercent(Math.round((event.loaded / event.total) * 100));
        }
      });
      xhr.addEventListener("load", () => {
        setUploadPercent(null);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(String(xhr.status)));
        }
      });
      xhr.addEventListener("error", () => {
        setUploadPercent(null);
        reject(new Error("network"));
      });
      xhr.send(formData);
    });
  }

  async function upload(kind: "thumbnail" | "video" | "files", file: File) {
    setIsBusy(true);
    try {
      await uploadWithProgress(`/api/proxy/admin/lectures/${lecture.id}/${kind}`, file);
      onChanged();
    } finally {
      setIsBusy(false);
    }
  }

  async function removeFile(fileId: string) {
    await fetch(`/api/proxy/admin/lectures/files/${fileId}`, { method: "DELETE" });
    onChanged();
  }

  const meta = statusMeta[lecture.status];

  return (
    <div className="border-b border-border last:border-0">
      <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-2/50">
        <button onClick={() => setIsOpen((v) => !v)} className="flex min-w-0 flex-1 items-center gap-3 text-right">
          <span
            className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
              lecture.videoAssetId ? "bg-accent-soft text-accent" : "bg-surface-2 text-muted"
            }`}
          >
            <IconPlay width={15} height={15} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm text-ink">
              <span className="font-mono text-xs tabular-nums text-muted">{lecture.number}.</span> {lecture.title}
            </span>
            <span className="mt-0.5 block text-xs text-muted">
              {lecture.files.length > 0 ? `${lecture.files.length} ملف` : "بدون ملفات"}
              {lecture.videoAssetId ? " · فيديو مرفوع" : ""}
            </span>
          </span>
        </button>

        <Badge tone={meta.tone}>{meta.label}</Badge>

        {lecture.status !== "published" && (
          <button
            onClick={publish}
            disabled={isBusy}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-accent-ink transition-colors hover:bg-accent-soft disabled:opacity-50"
          >
            <IconCheck width={14} height={14} />
            نشر
          </button>
        )}

        <button
          onClick={removeLecture}
          aria-label="حذف المحاضرة"
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          <IconTrash width={15} height={15} />
        </button>
      </div>

      {isOpen && (
        <div className="space-y-5 border-t border-border bg-surface-2/60 px-5 py-5">
          {uploadPercent !== null && (
            <div>
              <p className="mb-1.5 text-xs text-ink-soft">جارٍ الرفع… {uploadPercent}%</p>
              <ProgressBar percent={uploadPercent} />
            </div>
          )}

          {chapterOptions && (
            <div>
              <p className="mb-2 text-xs font-medium text-ink-soft">الفصل</p>
              <select
                value={chapterId}
                disabled={isBusy}
                onChange={(e) => moveToChapter(e.target.value)}
                className="w-full max-w-sm rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-accent disabled:opacity-50"
              >
                {chapterOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.subjectName} — {option.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-medium text-ink-soft">الصورة المصغّرة</p>
              {lecture.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={lecture.thumbnailUrl}
                  alt=""
                  className="mb-2 h-20 w-32 rounded-md border border-border object-cover"
                />
              )}
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent-ink">
                <IconUpload width={14} height={14} />
                {lecture.thumbnailUrl ? "تغيير" : "رفع صورة"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => e.target.files?.[0] && upload("thumbnail", e.target.files[0])}
                />
              </label>
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-ink-soft">
                الفيديو (MP4) {lecture.videoAssetId && <span className="text-success">· مرفوع</span>}
              </p>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent-ink">
                <IconUpload width={14} height={14} />
                {lecture.videoAssetId ? "استبدال الفيديو" : "رفع فيديو"}
                <input
                  type="file"
                  accept="video/mp4,video/*"
                  hidden
                  onChange={(e) => e.target.files?.[0] && upload("video", e.target.files[0])}
                />
              </label>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-ink-soft">الملفات الملحقة</p>
            {lecture.files.length > 0 && (
              <ul className="mb-2 space-y-1.5">
                {lecture.files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs"
                  >
                    <IconFile width={14} height={14} className="shrink-0 text-muted" />
                    <span className="min-w-0 flex-1 truncate text-ink-soft">{file.fileName}</span>
                    <button
                      onClick={() => removeFile(file.id)}
                      className="shrink-0 text-danger transition-opacity hover:opacity-75"
                    >
                      حذف
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent-ink">
              <IconUpload width={14} height={14} />
              إضافة ملف
              <input
                type="file"
                hidden
                onChange={(e) => e.target.files?.[0] && upload("files", e.target.files[0])}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
