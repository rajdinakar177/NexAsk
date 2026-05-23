"use client";

import { IconPaperclip } from "@tabler/icons-react";

function handleAttachmentError(
  e: React.SyntheticEvent<HTMLImageElement>,
  url: string
) {
  const wrapper = e.currentTarget.parentElement;
  if (!wrapper) return;
  e.currentTarget.style.display = "none";
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className =
    "inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/50";
  link.textContent = "View attachment";
  wrapper.appendChild(link);
}

export default function AttachmentPreview({ url }: { url: string }) {
  return (
    <div className="mb-4">
      <img
        src={url}
        alt="Attachment"
        className="max-h-96 w-auto rounded-xl border border-white/10 object-contain"
        onError={(e) => handleAttachmentError(e, url)}
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1.5 flex items-center gap-1 text-[11px] text-white/25 transition hover:text-orange-400"
      >
        <IconPaperclip size={10} />
        Open full size
      </a>
    </div>
  );
}