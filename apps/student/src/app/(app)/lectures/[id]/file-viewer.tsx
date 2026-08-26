"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { IconFile, IconEye, IconClose, IconLock } from "@/components/icons";

interface LectureFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function kindOf(fileType: string) {
  if (fileType.startsWith("image/")) return "image" as const;
  if (fileType === "application/pdf") return "pdf" as const;
  if (fileType.startsWith("text/")) return "text" as const;
  return "other" as const;
}

/**
 * Course files open in an in-app overlay instead of being handed to the
 * browser as downloads. The bytes still travel over the network — this stops
 * casual sharing, it is not DRM.
 */
export function FileViewer({ files }: { files: LectureFile[] }) {
  const [active, setActive] = useState<LectureFile | null>(null);

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [active]);

  return (
    <>
      <Card className="overflow-hidden">
        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => setActive(file)}
            className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-right text-sm transition-colors last:border-0 hover:bg-surface-2"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted">
              <IconFile width={15} height={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink">{file.fileName}</span>
              <span className="font-mono text-xs tabular-nums text-muted">
                {formatSize(file.fileSize)}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-xs text-accent-ink">
              <IconEye width={14} height={14} />
              عرض
            </span>
          </button>
        ))}
      </Card>

      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <IconLock width={13} height={13} />
        الملفات للعرض داخل التطبيق فقط — غير مسموح بتحميلها أو مشاركتها.
      </p>

      {active && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
          onContextMenu={(event) => event.preventDefault()}
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-sm text-white">
              {active.fileName}
            </span>
            <button
              onClick={() => setActive(null)}
              aria-label="إغلاق"
              className="flex size-8 items-center justify-center rounded-md text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <IconClose width={18} height={18} />
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {kindOf(active.fileType) === "image" ? (
              <img
                src={`/api/media/files/${active.id}`}
                alt={active.fileName}
                draggable={false}
                className="mx-auto max-h-full select-none rounded-lg"
              />
            ) : kindOf(active.fileType) === "other" ? (
              <div className="mx-auto mt-16 max-w-sm rounded-lg bg-surface p-6 text-center">
                <p className="text-sm text-ink">
                  هذا النوع من الملفات لا يمكن عرضه داخل التطبيق.
                </p>
                <p className="mt-2 text-xs text-muted">
                  راجع الإدارة لطلب صيغة قابلة للعرض (PDF أو صورة).
                </p>
              </div>
            ) : (
              <iframe
                src={`/api/media/files/${active.id}#toolbar=0&navpanes=0`}
                title={active.fileName}
                className="mx-auto h-full w-full max-w-4xl rounded-lg bg-white"
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
