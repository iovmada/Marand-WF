import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import vm from 'node:vm';
import {applyGoogleTag,GOOGLE_TAG,GOOGLE_TAG_ID} from './google-tag.mjs';

test('Google tag generator inserts once after charset and survives repeat builds',()=>{
  for(const source of ['<head>\n<meta charset="UTF-8" />\n<title>Example</title></head>','<head><title>Example</title></head>']){
    const installed=applyGoogleTag(source);
    assert.equal(applyGoogleTag(installed),installed);
    assert.equal(installed.match(/googletagmanager\.com\/gtag\/js/g).length,1);
    assert(installed.indexOf(GOOGLE_TAG)<installed.indexOf('<title>'));
    if(source.includes('charset'))assert(installed.indexOf('charset')<installed.indexOf(GOOGLE_TAG));
  }
  assert.throws(()=>applyGoogleTag('<body>No head</body>'));
});

test('every content page includes exactly one supplied Ads config, before other scripts',()=>{
  const root=new URL('../',import.meta.url);
  const paths=['index.html','404.html'];
  for(const entry of readdirSync(root,{withFileTypes:true})){
    if(!entry.isDirectory()||entry.name==='wp-theme')continue;
    try{readFileSync(new URL(`${entry.name}/index.html`,root));paths.push(`${entry.name}/index.html`);}catch(error){if(error.code!=='ENOENT')throw error;}
  }
  assert.equal(paths.length,16);
  for(const path of paths){
    const html=readFileSync(new URL(path,root),'utf8'),head=html.split(/<head\b[^>]*>/i)[1].split('</head>')[0];
    assert.equal((html.match(/googletagmanager\.com\/gtag\/js/g)||[]).length,1,path);
    assert.equal((html.match(/gtag\('config', 'AW-18552575833'\)/g)||[]).length,1,path);
    assert(head.includes(GOOGLE_TAG),path);
    assert.equal(head.indexOf('<script'),head.indexOf('<script async src="https://www.googletagmanager.com/'),path);
  }
});

test('snippet queues one initialization and one Ads config without invented conversions',()=>{
  const context={};context.window=context;
  vm.runInNewContext(GOOGLE_TAG.match(/<script>([\s\S]*?)<\/script>/)[1],context);
  assert.equal(context.dataLayer.length,2);
  assert.equal(context.dataLayer[0][0],'js');
  assert.equal(context.dataLayer[1][0],'config');
  assert.equal(context.dataLayer[1][1],GOOGLE_TAG_ID);
});
