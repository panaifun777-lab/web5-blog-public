import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const files = [
  'src/app/page.tsx',
  'src/components/web5/footer.tsx',
  'src/lib/web5/ai/eidolon-writer.ts',
  'src/lib/web5/rag/retriever.ts',
  'src/lib/web5/rag/loader.ts',
  'src/lib/web5/seo.ts',
  'scripts/seed-rag.mjs',
  'src/components/web5/effects/matrix-rain.tsx',
  'src/components/providers.tsx',
  'src/lib/i18n/index.tsx',
  'src/lib/i18n/locales/zh-CN.ts',
  'src/lib/i18n/locales/en.ts',
  'src/lib/i18n/locales/ja.ts',
  'src/lib/i18n/locales/ko.ts',
  'src/lib/i18n/locales/es.ts',
  'src/components/web5/i18n/language-switcher.tsx',
  'src/app/founder/page.tsx',
  'src/app/layout.tsx',
  'src/app/admin/page.tsx',
  'src/components/web5/explore/explore-panel.tsx',
  'src/components/web5/settings/settings-panel.tsx',
  'src/components/web5/ritual/scan-ritual.tsx',
  'src/lib/web5/vessel-auth.ts',
  'src/app/api/auth/twitter/callback/route.ts',
  'src/app/api/auth/vessel-login/route.ts',
  'src/app/api/ap2/pay/route.ts',
  'src/app/api/ap2/budget/route.ts',
  'src/app/api/eidolon/deploy/route.ts',
  'src/components/web5/blog/blog-feed.tsx',
  'src/components/web5/dashboard/my-vessels.tsx',
  'src/app/api/distribution/farcaster/route.ts',
  'src/components/web5/write/writer.tsx',
  'src/app/api/ap2/budget/route.ts',
  'src/app/api/eidolon/deploy/route.ts',
  'src/app/api/autonomous/tick/route.ts',
  'src/app/api/arp/referral/route.ts',
  'src/app/api/marketplace/list/route.ts',
  'src/app/api/defi/harvest/route.ts',
  'src/app/api/distribution/farcaster/route.ts',
  'src/app/api/alerts/route.ts',
  'src/lib/web5/autonomous/scheduler.ts',
  'src/lib/web5/arp/referral.ts',
  'src/lib/web5/defi/harvester.ts',
  'src/lib/web5/distribution/farcaster.ts',
  'src/lib/web5/alerts/alerter.ts',
  'src/app/api/dashboard/route.ts',
  // '.env', // excluded — send manually via SSH for security
  'public/favicon.svg',
];

const base = 'C:/Users/Administrator/Desktop/Web5.blog';
const lines = ['#!/bin/bash', 'cd /root/web5-blog', ''];

for (const f of files) {
  const fullPath = join(base, f);
  if (existsSync(fullPath)) {
    const content = readFileSync(fullPath, 'utf8');
    const b64 = Buffer.from(content).toString('base64');
    lines.push('echo "OK: ' + f + '"');
    lines.push('mkdir -p $(dirname "' + f + '")');
    lines.push('echo "' + b64 + '" | base64 -d > "' + f + '"');
  }
}

lines.push('');
lines.push('echo "=== Sync complete ==="');

writeFileSync('C:/Users/Administrator/Desktop/Web5.blog/deploy-latest.sh', lines.join('\n'));
console.log('Generated deploy-latest.sh: ' + lines.join('\n').length + ' bytes');
