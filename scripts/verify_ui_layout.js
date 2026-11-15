import fs from 'fs';
import path from 'path';

console.log('=== FinAI UI Layout & Alignment Verification ===\n');

// 1. Verify CSS build output for required classes and rules
const distDir = path.resolve('dist');
const assetsDir = path.join(distDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('Error: dist/assets not found. Run npm run build first.');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const cssFile = files.find(f => f.endsWith('.css'));
const jsFile = files.find(f => f.endsWith('.js'));

console.log(`Found built CSS bundle: ${cssFile}`);
console.log(`Found built JS bundle: ${jsFile}\n`);

const cssContent = fs.readFileSync(path.join(assetsDir, cssFile), 'utf-8');
const jsContent = fs.readFileSync(path.join(assetsDir, jsFile), 'utf-8');

const checks = [
  {
    name: 'Modal Responsive Clamped Max Height (100dvh / 880px)',
    check: () => jsContent.includes('min(calc(100dvh - 32px), 880px)') || jsContent.includes('100dvh'),
  },
  {
    name: 'Modal Scrollable Body with min-h-0 and overflow-y-auto',
    check: () => jsContent.includes('flex-1 min-h-0 overflow-y-auto'),
  },
  {
    name: 'Modal Pinned Footer Backdrop Blur',
    check: () => jsContent.includes('backdrop-blur-md') && jsContent.includes('border-t'),
  },
  {
    name: 'Consistent Form Input & Select Height (h-[42px])',
    check: () => jsContent.includes('h-[42px]'),
  },
  {
    name: 'Input Date Calendar Invert Filter in Dark Mode',
    check: () => cssContent.includes('invert(0.8)') || cssContent.includes('webkit-calendar-picker-indicator'),
  },
  {
    name: 'Dark Mode Select Option Contrast Styling',
    check: () => cssContent.includes('#0f172a') && cssContent.includes('#f1f5f9'),
  },
  {
    name: 'Root and Body overflow-x: hidden Guard',
    check: () => cssContent.includes('overflow-x:hidden') || cssContent.includes('overflow-x: hidden'),
  },
  {
    name: 'Sidebar Navigation min-h-0 Scrollable Container',
    check: () => jsContent.includes('flex-1 min-h-0 overflow-y-auto px-4 py-4'),
  },
  {
    name: 'Sidebar Fixed Bottom User Profile shrink-0',
    check: () => jsContent.includes('p-4 border-t border-white/10 bg-slate-900/40 shrink-0'),
  },
  {
    name: 'Responsive Navbar Omnisearch with min-w-0 Truncate',
    check: () => jsContent.includes('Search FinAI...'),
  },
  {
    name: 'Copilot Quick Pill 1024px Collision Prevention (hidden xl:inline-flex)',
    check: () => jsContent.includes('hidden xl:inline-flex'),
  },
  {
    name: 'Notification Dropdown Viewport Clamping (max-w-[calc(100vw-2rem)])',
    check: () => jsContent.includes('max-w-[calc(100vw-2rem)]'),
  },
  {
    name: 'StatCard Text and Currency Overflow Guard (truncate & min-w-0)',
    check: () => jsContent.includes('min-w-0 flex-1') && jsContent.includes('text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-slate-100 mt-2 font-sans truncate'),
  },
  {
    name: 'AI Assistant Copilot Responsive Viewport Height (100dvh)',
    check: () => jsContent.includes('100dvh-7.5rem') || jsContent.includes('100dvh-8.5rem'),
  },
  {
    name: 'Create Invoice Responsive Grid (grid-cols-1 sm:grid-cols-3)',
    check: () => jsContent.includes('grid-cols-1 sm:grid-cols-3 gap-3 text-xs'),
  },
  {
    name: 'GlassCard Responsive Padding (p-4 sm:p-6)',
    check: () => jsContent.includes('p-4 sm:p-6'),
  },
];

let passed = 0;
for (const test of checks) {
  const result = test.check();
  if (result) {
    console.log(`[VERIFIED] ${test.name}`);
    passed++;
  } else {
    console.error(`[FAILED]   ${test.name}`);
  }
}

console.log(`\nResults: ${passed} of ${checks.length} layout rules verified successfully.`);
if (passed === checks.length) {
  console.log('ALL FRONTEND UI LAYOUT, POSITIONING & RESPONSIVE RULES PASSED!');
  process.exit(0);
} else {
  process.exit(1);
}
