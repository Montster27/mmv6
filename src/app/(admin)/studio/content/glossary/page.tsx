"use client";

import { TERM_LIST } from "@/lib/contentStudio/terms";

export default function GlossaryPage() {
  return (
    <div className="h-full overflow-auto bg-slate-50 p-5">
      <div className="mx-auto max-w-3xl space-y-4">
        <header>
          <p className="text-xs uppercase tracking-widest text-indigo-700">Content Studio</p>
          <h1 className="text-2xl font-semibold text-slate-900">Glossary</h1>
          <p className="mt-1 text-sm text-slate-600">
            The words Studio uses, in plain language. If you see one of the “also called” names elsewhere, it means the same thing.
          </p>
        </header>
        <dl className="space-y-3">
          {TERM_LIST.map((term) => (
            <div key={term.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <dt className="font-semibold text-slate-900">
                {term.label}
                {term.alsoCalled?.length ? (
                  <span className="ml-2 text-xs font-normal text-slate-500">also called {term.alsoCalled.join(", ")}</span>
                ) : null}
              </dt>
              <dd className="mt-1 text-sm text-slate-700">{term.short}</dd>
              <dd className="mt-1 text-sm text-slate-500">{term.long}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
