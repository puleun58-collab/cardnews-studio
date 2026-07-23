import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
const roots=['src','public','tests']
const forbidden=['@your_account','focus-quote','나만의 카드뉴스 스튜디오']
const textExt=new Set(['.ts','.tsx','.css','.html','.json','.md','.mjs','.ps1'])
const failures=[]
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(forbidden.some(word=>entry.name.includes(word)))failures.push(`파일명: ${path}`);if(entry.isDirectory())await walk(path);else if(textExt.has(extname(entry.name))){const content=await readFile(path,'utf8');for(const word of forbidden)if(content.includes(word))failures.push(`${relative('.',path)}: ${word}`)}}}
for(const root of roots)try{await walk(root)}catch(error){if(error.code!=='ENOENT')throw error}
if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log('브랜드 검사 통과: 제거 대상 문자열 0건')
