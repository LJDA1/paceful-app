'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-stone-200 mt-auto">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-800">Paceful</span>
            <span className="text-stone-400 text-sm">© {new Date().getFullYear()}</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-stone-500">
            <Link href="/privacy" className="hover:text-stone-800 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-stone-800 transition-colors">
              Terms of Service
            </Link>
            <a
              href="mailto:support@paceful.com"
              className="hover:text-stone-800 transition-colors"
            >
              Contact
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          Paceful is not a substitute for professional mental health care.
          If you&apos;re in crisis, please contact a mental health professional or crisis hotline.
        </p>
      </div>
    </footer>
  );
}

export function MinimalFooter() {
  return (
    <footer className="py-4 px-4 text-center text-xs text-stone-400">
      <div className="flex items-center justify-center gap-4">
        <Link href="/privacy" className="hover:text-stone-600 transition-colors">
          Privacy
        </Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-stone-600 transition-colors">
          Terms
        </Link>
        <span>·</span>
        <a href="mailto:support@paceful.com" className="hover:text-stone-600 transition-colors">
          Contact
        </a>
      </div>
    </footer>
  );
}
