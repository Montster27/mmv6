import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MMV Studios - A New Way to Play",
  description:
    "MMV is crafting a premium digital experience exclusively for an active 55+ community. Dignified gaming that prioritizes your pace, your health, and your connections.",
};

// ---------------------------------------------------------------------------
// Landing page for mmvstudios.com
// Design exported from Google Stitch, converted to Next.js + Tailwind
// Game lives at /play — this is the marketing/launch page.
// ---------------------------------------------------------------------------

export default function LandingPage() {
  return (
    <div className="font-[var(--font-inter)] bg-[#f8fafb] text-[#191c1d] antialiased selection:bg-[#a3ecf0] selection:text-[#002021]">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="bg-[#f8fafb] sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-8 py-6 max-w-screen-2xl mx-auto">
          <div className="text-2xl font-bold tracking-tighter text-[#003061]">
            MMV
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a
              className="text-[#004A77] border-b-2 border-[#004A77] pb-1 tracking-[0.01em] text-lg font-medium"
              href="#hero"
            >
              Home
            </a>
            <a
              className="text-[#40484c] hover:bg-[#f2f4f5] transition-colors duration-200 tracking-[0.01em] text-lg font-medium px-3 py-1 rounded"
              href="#benefits"
            >
              Benefits
            </a>
            <a
              className="text-[#40484c] hover:bg-[#f2f4f5] transition-colors duration-200 tracking-[0.01em] text-lg font-medium px-3 py-1 rounded"
              href="#survey"
            >
              Shape the Future
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/play"
              className="bg-[#003061] text-white px-8 py-3 h-14 rounded-xl text-lg font-semibold hover:bg-[#1f477b] transition-all active:scale-95 duration-150 flex items-center"
            >
              Play Now
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ────────────────────────────────────────────────── */}
        <section
          className="relative overflow-hidden bg-[#f8fafb] py-24 md:py-32"
          id="hero"
        >
          <div className="max-w-screen-2xl mx-auto px-8 grid lg:grid-cols-2 gap-16 items-center">
            <div className="z-10">
              <h1 className="text-[3.5rem] leading-tight font-black tracking-tight text-[#1f477b] mb-6">
                A New Way to Play.{" "}
                <br />
                Designed for You.
              </h1>
              <p className="text-xl text-[#41474f] mb-10 max-w-xl leading-relaxed tracking-wide">
                MMV is crafting a premium digital experience exclusively for an
                active 55+ community. Dignified gaming that prioritizes your
                pace, your health, and your connections.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/play"
                  className="bg-gradient-to-br from-[#003061] to-[#1f477b] text-white px-10 py-5 h-[3.5rem] rounded-md text-lg font-bold shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  Join the Inner Circle
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square bg-[#f2f4f5] rounded-full overflow-hidden flex items-center justify-center p-8">
                <div className="w-full h-full rounded-full bg-white shadow-2xl overflow-hidden flex items-center justify-center">
                  <div className="bg-gradient-to-br from-[#003061] to-[#1f477b] w-4/5 h-4/5 rounded-full flex items-center justify-center text-white">
                    <svg
                      className="w-24 h-24"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                      />
                    </svg>
                  </div>
                </div>
              </div>
              {/* Decorative blur */}
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-[#a6eff3] rounded-full blur-3xl opacity-40" />
            </div>
          </div>
        </section>

        {/* ── Benefits ───────────────────────────────────────────── */}
        <section className="py-24 bg-[#f2f4f5]" id="benefits">
          <div className="max-w-screen-2xl mx-auto px-8 text-center">
            <div className="mb-16">
              <h2 className="text-4xl font-bold text-[#003061] mb-4">
                Reimagining Connection
              </h2>
              <p className="text-[#41474f] max-w-2xl mx-auto text-xl italic">
                Take a look at a life well lived.
              </p>
            </div>
          </div>
        </section>

        {/* ── Survey / Co-Creation ───────────────────────────────── */}
        <section className="py-32 bg-[#f8fafb]" id="survey">
          <div className="max-w-screen-xl mx-auto px-8">
            <div className="grid lg:grid-cols-5 gap-16 items-start">
              {/* Left column */}
              <div className="lg:col-span-2">
                <div className="inline-block bg-[#a6eff3] px-4 py-1 rounded-full text-[#004f53] font-bold text-sm tracking-widest uppercase mb-6">
                  Co-Creation Phase
                </div>
                <h2 className="text-5xl font-black text-[#1f477b] mb-8 leading-tight">
                  Shape the Future of Play
                </h2>
                <p className="text-xl text-[#41474f] leading-relaxed mb-8">
                  We aren&apos;t building this alone. Your voice defines our
                  development. Join our early insight group and help us tailor
                  MMV to your lifestyle.
                </p>
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#eceeef] flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-[#003061]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-lg font-medium">
                      Early Beta Access
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[#eceeef] flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-[#003061]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-lg font-medium">
                      Monthly Insight Sessions
                    </span>
                  </div>
                </div>
              </div>

              {/* Right column — survey card */}
              <div className="lg:col-span-3 bg-[#e6e8e9] rounded-xl p-2 min-h-[600px] shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-[#e1e3e4] flex flex-col items-center justify-center text-center p-12">
                  <svg
                    className="w-16 h-16 text-[#003061] mb-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
                  </svg>
                  <h3 className="text-2xl font-bold mb-4">
                    Closed Alpha Survey
                  </h3>
                  <p className="text-[#41474f] mb-8 max-w-sm">
                    Please share your feedback through our secure community
                    form.
                  </p>
                  <a
                    className="bg-gradient-to-br from-[#003061] to-[#1f477b] text-white px-12 py-4 rounded-xl text-xl font-bold hover:scale-105 transition-transform inline-block"
                    href="https://forms.gle/cL3iZX1xJMRibmAH7"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open Official Form
                  </a>
                  <div className="mt-12 w-full p-4 bg-white rounded-lg text-sm text-[#727880] flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    Encrypted &amp; Secure Community Participation
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────────────────── */}
        <section className="py-24 bg-[#003061] text-white text-center">
          <div className="max-w-3xl mx-auto px-8">
            <h2 className="text-4xl md:text-5xl font-black mb-8">
              Ready for a better way to play?
            </h2>
            <Link
              href="/play"
              className="inline-block bg-[#a6eff3] text-[#004f53] px-12 py-6 rounded-md text-xl font-bold hover:bg-[#a3ecf0] transition-all"
            >
              Play the Game
            </Link>
            <p className="mt-8 text-[#93b6f1] opacity-80 italic">
              Limited founder spots remaining for Summer 2025 cohort.
            </p>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="bg-[#f2f4f5]">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-12 py-16 gap-8 max-w-screen-2xl mx-auto">
          <div className="text-xl font-black text-[#003061]">MMV</div>
          <div className="flex flex-wrap justify-center gap-8">
            <a
              className="text-[#40484c] tracking-wider hover:text-[#003061] underline decoration-2 min-h-[44px] flex items-center"
              href="#survey"
            >
              Join the List
            </a>
            <a
              className="text-[#40484c] tracking-wider hover:text-[#003061] underline decoration-2 min-h-[44px] flex items-center"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="text-[#40484c] tracking-wider hover:text-[#003061] underline decoration-2 min-h-[44px] flex items-center"
              href="#"
            >
              Accessibility
            </a>
          </div>
          <div className="text-[#40484c] tracking-wider text-center md:text-right">
            &copy; 2025 MMV Studios. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
