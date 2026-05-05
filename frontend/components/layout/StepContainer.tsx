"use client";

import type { ReactNode } from "react";

export function StepContainer({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--color-line)] bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
          {title}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--color-muted)]">
          {description}
        </p>
      </div>
      <div className="mt-6">{children}</div>
      {footer ? (
        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-[var(--color-line)] pt-5">
          {footer}
        </div>
      ) : null}
    </section>
  );
}
