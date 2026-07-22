"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { pickImageFile, uploadImage } from "./upload-client";

/**
 * Rich text editor for admins who don't write HTML. The toolbar covers the
 * formatting the storefront .prose styles render (headings, bold/italic, lists,
 * links, images). Emits clean HTML into a hidden input named `name` so it posts
 * with the surrounding <form> exactly like the old textarea did.
 */
export function RichTextEditor({
  name,
  defaultValue = "",
  ariaLabel = "Content",
}: {
  name: string;
  defaultValue?: string;
  ariaLabel?: string;
}) {
  const [html, setHtml] = useState(defaultValue);

  const editor = useEditor({
    // Avoids an SSR/hydration mismatch in the App Router.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ inline: false }),
    ],
    content: defaultValue,
    editorProps: {
      attributes: {
        class: "prose max-w-none min-h-[16rem] px-4 py-3 focus:outline-none",
        "aria-label": ariaLabel,
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  return (
    <div className="border border-line bg-paper">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  );
}

/* ---------- Toolbar ---------- */

function Toolbar({ editor }: { editor: Editor | null }) {
  const [, force] = useState(0);
  const linkRef = useRef<HTMLDivElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  // Re-render the toolbar as the selection/active marks change.
  useEffect(() => {
    if (!editor) return;
    const update = () => force((n) => n + 1);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  const addImage = useCallback(async () => {
    if (!editor) return;
    const file = await pickImageFile();
    if (!file) return;
    try {
      const url = await uploadImage(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Image upload failed.");
    }
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const url = linkValue.trim();
    if (url) {
      const href = /^https?:\/\//i.test(url) || url.startsWith("/") ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkOpen(false);
    setLinkValue("");
  }, [editor, linkValue]);

  if (!editor) {
    return <div className="h-11 border-b border-line bg-bone" aria-hidden />;
  }

  const btn = (active: boolean) =>
    cn(
      "flex h-8 min-w-8 items-center justify-center px-2 text-sm transition-colors",
      active ? "bg-ink text-bone" : "text-ink hover:bg-bone",
    );

  return (
    <div className="relative flex flex-wrap items-center gap-0.5 border-b border-line bg-bone p-1.5">
      <button type="button" title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive("bold"))}>
        <span className="font-bold">B</span>
      </button>
      <button type="button" title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive("italic"))}>
        <span className="italic">I</span>
      </button>
      <span className="mx-1 h-5 w-px bg-line" />
      <button type="button" title="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive("heading", { level: 2 }))}>
        H2
      </button>
      <button type="button" title="Subheading" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor.isActive("heading", { level: 3 }))}>
        H3
      </button>
      <span className="mx-1 h-5 w-px bg-line" />
      <button type="button" title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive("bulletList"))}>
        • List
      </button>
      <button type="button" title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive("orderedList"))}>
        1. List
      </button>
      <span className="mx-1 h-5 w-px bg-line" />
      <div ref={linkRef} className="relative">
        <button
          type="button"
          title="Link"
          onClick={() => {
            setLinkValue(editor.getAttributes("link").href ?? "");
            setLinkOpen((o) => !o);
          }}
          className={btn(editor.isActive("link") || linkOpen)}
        >
          Link
        </button>
        {linkOpen && (
          <div className="absolute top-9 left-0 z-10 flex w-72 gap-1 border border-line bg-paper p-2 shadow-lift">
            <input
              autoFocus
              value={linkValue}
              onChange={(e) => setLinkValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
                if (e.key === "Escape") setLinkOpen(false);
              }}
              placeholder="https://…  (empty to remove)"
              className="w-full border border-line bg-bone px-2 py-1 text-sm focus:border-ink focus:outline-none"
            />
            <button type="button" onClick={applyLink} className="shrink-0 bg-ink px-3 text-xs tracking-wide text-bone uppercase hover:bg-clay">
              Set
            </button>
          </div>
        )}
      </div>
      <button type="button" title="Insert image" onClick={addImage} className={btn(false)}>
        Image
      </button>
    </div>
  );
}
