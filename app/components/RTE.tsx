"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";

// Dynamically import to avoid SSR issues with MDEditor
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface RTEProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Called when user pastes an image — returns uploaded URL to inject as markdown */
  onImageUpload?: (file: File) => Promise<string>;
}

export default function RTE({
  value,
  onChange,
  placeholder = "Describe your question in detail…\n\nTip: use **bold**, `code`, and ``` fenced blocks for code snippets.",
  minHeight = 320,
  onImageUpload,
}: RTEProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback(
    (val: string | undefined) => onChange(val ?? ""),
    [onChange]
  );

  // Intercept paste for image upload
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!onImageUpload) return;
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((i) => i.type.startsWith("image/"));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      try {
        const url = await onImageUpload(file);
        onChange(value + `\n![image](${url})\n`);
      } catch {
        // silently ignore — user can upload via attachment button
      }
    },
    [onImageUpload, onChange, value]
  );

  return (
    <div
      ref={editorRef}
      onPaste={handlePaste}
      data-color-mode="dark"
      className="rte-wrapper overflow-hidden rounded-xl border border-white/10 transition-colors focus-within:border-orange-500/40 focus-within:ring-1 focus-within:ring-orange-500/20"
    >


      <MDEditor
        value={value}
        onChange={handleChange}
        height={minHeight}
        preview="edit"
        visibleDragbar={false}
        hideToolbar={false}
        enableScroll={true}
        textareaProps={{ placeholder }}
        style={{ minHeight }}
        components={{
          preview: (source) => <></>,
        }}
      />
    </div>
  );
}
