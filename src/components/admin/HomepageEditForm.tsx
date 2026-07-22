"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { updateHomepage, resetHomepage, type AdminActionState } from "@/lib/actions/admin";
import { AdminCard, adminInput, Label, SaveButton } from "@/components/admin/ui";
import { pickImageFile, uploadImage } from "./upload-client";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Cfg = { sections: any[] };

const initialState: AdminActionState = { status: "idle" };

// Friendly labels for each section type shown on the homepage.
const SECTION_TITLES: Record<string, string> = {
  slideshow: "Hero slideshow",
  richText: "Intro statement",
  imageWithTextOverlay: "Headwear feature",
  imageBanner: "Hoodie feature",
  imageWithText: "The Edit — story",
  imagesWithText: "The Edit — extra copy",
  mediaBanner: "Full-width banner",
  featuredCollection: "Featured object heading",
  guarantees: "Assurances",
  faq: "Questions & answers",
};

const EDITABLE = new Set(Object.keys(SECTION_TITLES));

export function HomepageEditForm({ config }: { config: Cfg }) {
  const [cfg, setCfg] = useState<Cfg>(() => structuredClone(config));
  const [state, formAction, pending] = useActionState(updateHomepage, initialState);

  // Replace section at index with an updated copy.
  const patch = (i: number, updater: (s: any) => void) =>
    setCfg((prev) => {
      const next = structuredClone(prev);
      updater(next.sections[i]);
      return next;
    });

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="config" value={JSON.stringify(cfg)} readOnly />

      {cfg.sections.map((section, i) =>
        EDITABLE.has(section.type) ? (
          <AdminCard key={i} className="space-y-4">
            <h2 className="font-display text-base font-bold">
              {SECTION_TITLES[section.type]}
            </h2>
            <SectionFields section={section} onChange={(u) => patch(i, u)} />
          </AdminCard>
        ) : null,
      )}

      <div className="flex flex-wrap items-center gap-4 pt-2">
        <SaveButton pending={pending} />
        <p aria-live="polite" className="text-sm">
          {state.status === "success" && <span className="text-moss">✓ {state.message}</span>}
          {state.status === "error" && <span className="text-clay">{state.message}</span>}
        </p>
        <button
          type="submit"
          formAction={resetHomepage}
          className="ml-auto text-sm text-stone underline underline-offset-2 hover:text-clay"
          onClick={(e) => {
            if (!confirm("Reset the homepage to its original content? Your changes will be lost."))
              e.preventDefault();
          }}
        >
          Reset to original
        </button>
      </div>
    </form>
  );
}

/* ---------- Per-section fields ---------- */

function SectionFields({ section, onChange }: { section: any; onChange: (u: (s: any) => void) => void }) {
  switch (section.type) {
    case "slideshow":
      return (
        <div className="space-y-6">
          {section.slides.map((slide: any, si: number) => (
            <div key={si} className="border-t border-line pt-4 first:border-0 first:pt-0">
              <p className="mb-2 text-xs tracking-wide text-stone uppercase">Slide {si + 1}</p>
              <div className="space-y-3">
                <Text label="Eyebrow" value={slide.eyebrow} onChange={(v) => onChange((s) => (s.slides[si].eyebrow = v))} />
                <Text label="Heading" value={slide.heading} onChange={(v) => onChange((s) => (s.slides[si].heading = v))} />
                <Area label="Body" value={slide.body} onChange={(v) => onChange((s) => (s.slides[si].body = v))} />
                <CtaFields cta={slide.cta} onChange={(u) => onChange((s) => u(s.slides[si].cta))} />
                <ImagePick label="Slide image" value={slide.image} onChange={(v) => onChange((s) => (s.slides[si].image = v))} />
              </div>
            </div>
          ))}
        </div>
      );

    case "richText":
    case "imageWithText":
    case "imagesWithText":
      return (
        <div className="space-y-3">
          <Text label="Heading" value={section.heading} onChange={(v) => onChange((s) => (s.heading = v))} />
          {section.paragraphs?.map((p: string, pi: number) => (
            <Area key={pi} label={`Paragraph ${pi + 1}`} value={p} onChange={(v) => onChange((s) => (s.paragraphs[pi] = v))} />
          ))}
          {section.cta && <CtaFields cta={section.cta} onChange={(u) => onChange((s) => u(s.cta))} />}
          {section.image && <ImagePick label="Image" value={section.image} onChange={(v) => onChange((s) => (s.image = v))} />}
          {Array.isArray(section.images) &&
            section.images.map((img: string, ii: number) => (
              <ImagePick key={ii} label={`Image ${ii + 1}`} value={img} onChange={(v) => onChange((s) => (s.images[ii] = v))} />
            ))}
        </div>
      );

    case "imageWithTextOverlay":
      return (
        <div className="space-y-3">
          <Text label="Heading" value={section.heading} onChange={(v) => onChange((s) => (s.heading = v))} />
          <Text label="Subheading" value={section.subheading} onChange={(v) => onChange((s) => (s.subheading = v))} />
          <Area label="Body" value={section.body} onChange={(v) => onChange((s) => (s.body = v))} />
          <CtaFields cta={section.cta} onChange={(u) => onChange((s) => u(s.cta))} />
          <ImagePick label="Image" value={section.image} onChange={(v) => onChange((s) => (s.image = v))} />
        </div>
      );

    case "imageBanner":
      return (
        <div className="space-y-3">
          <Text label="Heading" value={section.heading} onChange={(v) => onChange((s) => (s.heading = v))} />
          <Area label="Body" value={section.body} onChange={(v) => onChange((s) => (s.body = v))} />
          <CtaFields cta={section.cta} onChange={(u) => onChange((s) => u(s.cta))} />
          <ImagePick label="Image" value={section.image} onChange={(v) => onChange((s) => (s.image = v))} />
          {section.imageMobile && (
            <ImagePick label="Mobile image" value={section.imageMobile} onChange={(v) => onChange((s) => (s.imageMobile = v))} />
          )}
        </div>
      );

    case "mediaBanner":
    case "featuredCollection":
      return (
        <div className="space-y-3">
          <Text label="Heading" value={section.heading} onChange={(v) => onChange((s) => (s.heading = v))} />
          {section.image && <ImagePick label="Image" value={section.image} onChange={(v) => onChange((s) => (s.image = v))} />}
        </div>
      );

    case "guarantees":
      return (
        <div className="space-y-3">
          <Text label="Heading" value={section.heading} onChange={(v) => onChange((s) => (s.heading = v))} />
          {section.items.map((it: any, ii: number) => (
            <div key={ii} className="grid gap-2 sm:grid-cols-2">
              <Text label={`Title ${ii + 1}`} value={it.title} onChange={(v) => onChange((s) => (s.items[ii].title = v))} />
              <Text label="Text" value={it.body} onChange={(v) => onChange((s) => (s.items[ii].body = v))} />
            </div>
          ))}
        </div>
      );

    case "faq":
      return (
        <div className="space-y-3">
          <Text label="Heading" value={section.heading} onChange={(v) => onChange((s) => (s.heading = v))} />
          {section.items.map((it: any, ii: number) => (
            <div key={ii} className="space-y-2 border-t border-line pt-3 first:border-0 first:pt-0">
              <Text label={`Question ${ii + 1}`} value={it.question} onChange={(v) => onChange((s) => (s.items[ii].question = v))} />
              <Area label="Answer" value={it.answer} onChange={(v) => onChange((s) => (s.items[ii].answer = v))} />
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}

/* ---------- Small field controls ---------- */

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor="">{label}</Label>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={adminInput} />
    </div>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label htmlFor="">{label}</Label>
      <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} rows={3} className={adminInput} />
    </div>
  );
}

function CtaFields({ cta, onChange }: { cta: { label: string; href: string }; onChange: (u: (c: any) => void) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Text label="Button text" value={cta.label} onChange={(v) => onChange((c) => (c.label = v))} />
      <Text label="Button link" value={cta.href} onChange={(v) => onChange((c) => (c.href = v))} />
    </div>
  );
}

function ImagePick({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async () => {
    const file = await pickImageFile();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Label htmlFor="">{label}</Label>
      <div className="flex items-center gap-3">
        <span className="relative h-16 w-16 shrink-0 overflow-hidden border border-line bg-bone">
          {value && <Image src={value} alt="" fill sizes="64px" className="object-cover" />}
        </span>
        <button
          type="button"
          onClick={choose}
          disabled={busy}
          className="h-9 border border-ink bg-ink px-4 font-display text-[11px] tracking-[0.2em] text-bone uppercase transition-colors hover:bg-transparent hover:text-ink disabled:opacity-50"
        >
          {busy ? "Uploading…" : "Change image"}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  );
}
