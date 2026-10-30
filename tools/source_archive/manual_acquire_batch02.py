"""Bounded, auditable acquisition of named first-party policy sources.
Produces original response bytes plus manifest; never changes canonical SQLite.
Do not infer legal authority or version validity from a successful download.
"""
from __future__ import annotations
import csv, hashlib, json, os, re, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ALLOW_HOSTS = {
 'uaelegislation.gov.ae','www.legislation.wa.gov.au','legis.senado.gov.br',
 'www2.camara.leg.br','www.funcionpublica.gov.co','eur-lex.europa.eu',
 'peraturan.bpk.go.id','www.ekonomi.gov.my','lovdata.no','www.resmigazete.gov.tr',
 'www.legislation.gov.uk','www.gov.za',
 'wap.miit.gov.cn','www.ndrc.gov.cn','www.legislation.gov.au',
 'laws-lois.justice.gc.ca','vanban.chinhphu.vn','www.dffe.gov.za',
 'ekonomi.gov.my','gxt.jiangsu.gov.cn','www.moj.gov.cn',
}
MAX_BYTES=40*1024*1024
OUTPUT=Path(os.environ.get('POLICY_OUTPUT','policy_source_evidence'))
OUTPUT.mkdir(parents=True,exist_ok=True)

class BoundedRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,request,fp,code,msg,headers,newurl):
  u=urllib.parse.urlsplit(newurl)
  if u.scheme!='https' or u.hostname not in ALLOW_HOSTS:
   raise ValueError('refused redirect outside approved publisher host: '+u.hostname.__str__())
  return super().redirect_request(request,fp,code,msg,headers,newurl)

def fetch(url):
 u=urllib.parse.urlsplit(url)
 if u.scheme!='https' or u.hostname not in ALLOW_HOSTS or u.username or u.password:
  raise ValueError('source URL host not in verified allowlist')
 op=urllib.request.build_opener(BoundedRedirect)
 request=urllib.request.Request(url,headers={'User-Agent':'CCUSPolicyHubManualEvidenceArchive/1.0 (research citation preservation)', 'Accept':'application/pdf,text/html;q=0.9,*/*;q=0.5'})
 with op.open(request,timeout=24) as response:
  effective=response.url
  if urllib.parse.urlsplit(effective).hostname not in ALLOW_HOSTS:raise ValueError('unexpected final hostname')
  chunks=[]; total=0
  while True:
   chunk=response.read(128*1024)
   if not chunk:break
   total+=len(chunk)
   if total>MAX_BYTES:raise ValueError('response exceeds size bound')
   chunks.append(chunk)
  return b''.join(chunks),effective,response.headers.get('Content-Type',''),response.status

def validate(blob,expected):
 lower=blob[:15000].lower()
 if blob.startswith(b'%PDF-'):
  if len(blob)<1024:return 'too_short_pdf'
  return 'pdf'
 if b'<html' in lower or lower.lstrip().startswith(b'<!doctype html'):
  if len(blob)<1200:return 'too_short_html'
  if any(v in lower for v in (b'captcha',b'checking your browser',b'cloudflare access denied',b'you are being rate limited',b"verify that you're not a robot",b'javascript is disabled in order to continue')):return 'blocked_html'
  if expected=='pdf':return 'html_instead_of_pdf'
  return 'html'
 return 'not_document'

def main(csv_file):
 rows=list(csv.DictReader(open(csv_file,encoding='utf-8-sig',newline='')))
 if len(rows)>40:raise ValueError('per-run human reviewed limit 40')
 seen=set();audit=[]
 for i,row in enumerate(rows,1):
  policy=row['policy_id']
  if not re.fullmatch(r'[a-z0-9][a-z0-9-]{3,100}',policy):raise ValueError('invalid policy_id: '+policy)
  if policy in seen:raise ValueError('duplicate policy_id: '+policy)
  seen.add(policy)
  entry={**row,'status':'pending','collected_at':datetime.now(timezone.utc).isoformat(timespec='seconds'), 'bytes':0,'format':'','sha256':'','saved_file':'','resolved_url':'','http_status':'','error':''}
  try:
   blob,effective,mime,status=fetch(row['url'])
   entry['resolved_url']=effective;entry['http_status']=status
   filetype=validate(blob,row['expected_format'])
   entry['format']=filetype
   if filetype in ('pdf','html'):
    digest=hashlib.sha256(blob).hexdigest()
    outfile=OUTPUT/(policy+'__'+digest[:14]+'.'+filetype)
    if not outfile.exists():outfile.write_bytes(blob)
    entry.update({'status':'saved_candidate','sha256':digest,'bytes':len(blob),'saved_file':outfile.name,'publisher_content_type':mime})
   else:
    entry['status']=filetype
  except Exception as e:
   entry['status']='fetch_failed';entry['error']=(type(e).__name__+': '+str(e))[:400]
  audit.append(entry)
  print(f'{i:02d}/{len(rows):02d} {policy:48} {entry["status"]:22} {entry["bytes"]}',flush=True)
  time.sleep(0.6)
 f=OUTPUT/'acquisition_manifest.csv'
 fields=list(dict.fromkeys(k for a in audit for k in a))
 with f.open('w',newline='',encoding='utf-8') as handle:
  writer=csv.DictWriter(handle,fieldnames=fields);writer.writeheader();writer.writerows(audit)
 (OUTPUT/'README.txt').write_text('Private research snapshots. All files are UNVERIFIED document candidates. Status saved_candidate proves transfer only; official authoritativeness, jurisdiction, document identity, applicable version and redistribution rights must be reviewed before ingestion to CCUS Policy Hub. Do not mutate canonical SQLite.\n',encoding='utf-8')
 print('FINISHED',json.dumps({k:sum(z['status']==k for z in audit) for k in set(z['status'] for z in audit)}))

if __name__=='__main__':main(sys.argv[1])
