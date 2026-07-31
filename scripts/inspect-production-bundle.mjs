import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../dist/',import.meta.url));
const forbidden=[
  'Populated demo','0.4-demo','export-demo','import-demo','Preview recovery flow',
  'Fake 12-day streak','31 July','prototype boundary','simulated persistence'
];
const suspicious=[
  [/developmentFixture|demoFixture|[?&]demo=/i,'development fixture or demo query'],
  [/firebase\/app|@supabase|amplitude|mixpanel|segment\.com/i,'cloud database or analytics SDK'],
  [/data:audio\/(?:mpeg|ogg|wav);base64/i,'embedded base64 run audio'],
  [/(?:api[_-]?key|secret)["']?\s*[:=]\s*["'][A-Za-z0-9_-]{20,}/i,'embedded credential']
];

async function files(dir) {
  const entries=await readdir(dir,{withFileTypes:true});
  return (await Promise.all(entries.map(entry=>entry.isDirectory()?files(join(dir,entry.name)):[join(dir,entry.name)]))).flat();
}

const findings=[];
for(const filename of await files(root)) {
  if(!['.html','.js','.css','.json','.webmanifest'].includes(extname(filename))) continue;
  const content=await readFile(filename,'utf8');
  for(const text of forbidden) if(content.includes(text)) findings.push(`${relative(root,filename)}: ${text}`);
  for(const [pattern,label] of suspicious) if(pattern.test(content)) findings.push(`${relative(root,filename)}: ${label}`);
}
if(findings.length) {
  console.error('Production bundle inspection failed:\n'+findings.map(item=>`- ${item}`).join('\n'));
  process.exitCode=1;
} else {
  console.log('Production bundle inspection passed: no demo remnants, fixture hooks, embedded credentials, cloud/analytics SDKs, or base64 run audio.');
}
