"""Shared archive engine. Colab notebooks embed this file so they are self-contained.

Boundaries: raw evidence backup to private Drive, never policy-DB writes or public republication.
"""
from __future__ import annotations
import csv
import hashlib
import io
import json
import os
import re
import sqlite3
import tempfile
import time
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, urlsplit, urlunsplit, unquote

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

GCCSI_CATALOG_ID = '1Vh_cLBzI1skRBXqbqe4fv-oiycuOWDxPzVdORs9RfZQ'
GCCSI_FOLDER_ID = '14oNNEBFEbx9piny8XdhUjpe3REcC8sgl'
POLICY_FOLDER_ID = '1S07jkytGKENRvA7zwXjnGARiKVZr5Vnx'
METADATA_FOLDER_ID = '12kOSesAeX367tV4gsx7GfH6JY_Q3X3Lo'
GITHUB_DB_URL = 'https://raw.githubusercontent.com/liuh886/ccus-policy-hub/main/agent/ccus-ai-agent/db/ccus_master.sqlite'

ROOT = Path('/content/ccus_archive_runtime') if Path('/content').exists() else Path(tempfile.gettempdir()) / 'ccus_archive_runtime'
MAX_BYTES = 300 * 1024 * 1024
RECHECK_DAYS = 45  # An existing file older than this can be checked again for updated bytes.
PUBLISHER_DELAY_SECONDS = 0.6
USER_AGENT = 'CCUSPolicyHubSourceArchiver/2.0 (research source preservation; low request rate)'


def utcnow():
    return datetime.now(timezone.utc).isoformat(timespec='seconds')


def sha_text(value):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()


def normalize_url(url):
    if not isinstance(url, str):
        return None
    url = url.strip().rstrip(').,;]')
    if not url or len(url) > 2048:
        return None
    p = urlsplit(url)
    if p.scheme.lower() != 'https' or not p.hostname or p.username or p.password:
        return None
    return urlunsplit(('https', p.netloc.lower(), p.path or '/', p.query, ''))


def safe_filename(name):
    name = unquote(name or 'document').replace('\\', '/')
    name = name.split('/')[-1]
    name = re.sub(r'[^\w.()\- ]+', '_', name, flags=re.UNICODE).strip(' ._')[:145]
    return name or 'document'


def source_name(url, kind, policy_id=''):
    stem = safe_filename(urlsplit(url).path.rsplit('/', 1)[-1])
    if not re.search(r'\.(pdf|docx?|html?|txt)$', stem, re.I):
        stem += '.html'
    if kind == 'primary_policy':
        return safe_filename(policy_id)[:65] + '__' + stem
    return stem


def session_factory():
    s = requests.Session()
    s.headers.update({'User-Agent': USER_AGENT, 'Accept': 'application/pdf,text/html,application/vnd.openxmlformats-officedocument.wordprocessingml.document,*/*;q=0.7'})
    retry = Retry(total=2, backoff_factor=1.2, status_forcelist=[429,500,502,503,504], allowed_methods=['GET'], respect_retry_after_header=True)
    s.mount('https://', HTTPAdapter(max_retries=retry, pool_connections=3, pool_maxsize=3))
    return s


def colab_services():
    from google.colab import auth
    import google.auth
    from googleapiclient.discovery import build
    auth.authenticate_user()
    creds, _ = google.auth.default(scopes=['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents.readonly'])
    return build('drive', 'v3', credentials=creds, cache_discovery=False), build('docs','v1',credentials=creds, cache_discovery=False)


def list_folder(drive, folder_id):
    result=[]; token=None
    while True:
        page = drive.files().list(q=f"'{folder_id}' in parents and trashed = false", pageSize=1000,
            fields='nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,appProperties,description)',pageToken=token).execute()
        result.extend(page.get('files', []))
        token=page.get('nextPageToken')
        if not token: break
    return result


def existing_indices(files):
    by_url={}; by_sha={}; filenames=set()
    for obj in sorted(files, key=lambda v: v.get('createdTime','')):
        props=obj.get('appProperties') or {}
        h=props.get('source_url_sha256')
        sha=props.get('sha256')
        if h: by_url[h]=obj
        for k,v in props.items():
            if k.startswith('source_url_alias_') and len(v)==64:by_url[v]=obj
        if sha: by_sha[sha]=obj
        filenames.add(obj.get('name',''))
    return by_url,by_sha,filenames


def due_for_recheck(obj, days):
    if days is None: return False
    if days <= 0: return True
    props=obj.get('appProperties') or {}
    stamp=props.get('checked_at') or obj.get('createdTime') or obj.get('modifiedTime')
    if not stamp: return False  # unknown legacy timestamps: skip instead of redownloading all
    try:
        stamp=datetime.fromisoformat(stamp.replace('Z','+00:00'))
        return (datetime.now(timezone.utc)-stamp).total_seconds() >= days*86400
    except ValueError:
        return False


def blob_type(filepath, first, content_type, allow_html):
    if first.startswith(b'%PDF-'): return ('pdf','application/pdf')
    if first.startswith(b'PK\x03\x04') and zipfile.is_zipfile(filepath):
        with zipfile.ZipFile(filepath) as z:
            if 'word/document.xml' in z.namelist(): return ('docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    if allow_html and (b'<!doctype html' in first.lower() or b'<html' in first.lower() or 'text/html' in content_type):
        # Do not preserve access-control, CAPTCHA, generic error or bot-check pages as authoritative text.
        data=filepath.read_bytes()[:120000].lower()
        blocked=(b'captcha', b'cf-chl-', b'just a moment', b'access denied', b'please enable javascript', b'cloudflare ray id', b'type="password"', b'log in to view', b'sign in to continue')
        if any(x in data for x in blocked): return ('blocked_html',None)
        if len(data) < 700: return ('html_too_short',None)
        return ('html','text/html')
    return ('not_document',None)


def retrieve(session,url,workdir,allow_html=False,host_validator=None,headers=None):
    """Return (local path, info dict). Any status other than downloaded leaves no local file."""
    tmp=workdir/(sha_text(url)[:20]+'.part'); tmp.parent.mkdir(parents=True,exist_ok=True)
    info={'http_status':'','status':'','bytes':0,'sha256':'','format':'','etag':'','last_modified':'','resolved_url':'','error':''}
    try:
        with session.get(url, stream=True, timeout=(12,110), allow_redirects=True, headers=headers or {}) as res:
            info['http_status']=res.status_code; info['resolved_url']=res.url
            info['etag']=(res.headers.get('ETag') or '')[:115]
            info['last_modified']=(res.headers.get('Last-Modified') or '')[:115]
            if res.status_code==304:
                info['status']='not_modified';return None,info
            if res.status_code in (401,403,407,429):
                info['status']='access_blocked';return None,info
            if res.status_code in (404,410):
                info['status']='not_found';return None,info
            if res.status_code!=200:
                info['status']='http_error';return None,info
            if host_validator and not host_validator(res.url):
                info['status']='redirect_outside_official';return None,info
            try: length=int(res.headers.get('Content-Length') or '0')
            except ValueError:length=0
            if length>MAX_BYTES:
                info['status']='too_large';return None,info
            digest=hashlib.sha256();total=0;first=b''
            with tmp.open('wb') as f:
                for block in res.iter_content(chunk_size=1024*1024):
                    if not block: continue
                    total+=len(block)
                    if total>MAX_BYTES:
                        info['status']='too_large';return None,info
                    if len(first)<1024:first=(first+block)[:1024]
                    digest.update(block);f.write(block)
            fmt,mime=blob_type(tmp,first,(res.headers.get('Content-Type') or '').lower(),allow_html)
            if not mime:
                info['status']=fmt;return None,info
            if total<500:
                info['status']='too_short';return None,info
            info.update(status='downloaded',bytes=total,sha256=digest.hexdigest(),format=fmt,mime_type=mime)
            return tmp,info
    except requests.RequestException as exc:
        info['status']='network_error';info['error']=f'{type(exc).__name__}: {str(exc)[:200]}'
        return None,info
    except Exception as exc:
        info['status']='validation_error';info['error']=f'{type(exc).__name__}: {str(exc)[:200]}'
        return None,info
    finally:
        if info['status']!='downloaded' and tmp.exists():tmp.unlink()


def create_upload(drive, local_file, folder_id, name, url, sha256, policy_id, kind, mime_type, headers):
    from googleapiclient.http import MediaFileUpload
    meta={'sha256':sha256,'source_url_sha256':sha_text(url),'checked_at':utcnow()}
    if policy_id: meta['policy_id']=str(policy_id)[:90]
    if headers.get('etag'): meta['etag']=headers['etag']
    if headers.get('last_modified'): meta['last_modified']=headers['last_modified']
    media=MediaFileUpload(str(local_file),mimetype=mime_type,resumable=True,chunksize=4*1024*1024)
    return drive.files().create(body={'name':name,'parents':[folder_id],
             'description':f'RAW {kind} source. URL: {url}; SHA256: {sha256}. Not approved for public redistribution.',
             'appProperties':meta},media_body=media,fields='id,name,mimeType,size,createdTime,appProperties').execute()


def mark_checked(drive,obj,headers):
    props=dict(obj.get('appProperties') or {})
    props['checked_at']=utcnow()
    if headers.get('etag'):props['etag']=headers['etag']
    if headers.get('last_modified'):props['last_modified']=headers['last_modified']
    drive.files().update(fileId=obj['id'],body={'appProperties':props},fields='id,appProperties').execute()
    obj['appProperties']=props


def capture_targets(drive,session,folder_id,targets,kind,recheck_days=RECHECK_DAYS,max_new=None):
    """Idempotent: incremental discovery, stale recheck, content dedup, immutable versions."""
    from googleapiclient.http import MediaFileUpload
    by_url,by_sha,names=existing_indices(list_folder(drive,folder_id))
    result=[];seen=set();new_count=0
    workdir=ROOT/kind;workdir.mkdir(parents=True,exist_ok=True)
    for position, item in enumerate(targets,1):
        url=normalize_url(item.get('url'))
        row={'collected_at':utcnow(),'policy_id':item.get('policy_id',''),
             'country':item.get('country',''),'title':item.get('title',''),
             'publisher':item.get('publisher',''),'source_type':kind,'inventory_sha256':item.get('inventory_sha256',''), 'url':url or item.get('url',''),
             'status':'','http_status':'','format':'','bytes':'','sha256':'',
             'drive_file_id':'','resolved_url':'','error':''}
        if not url:
            row.update(status='missing_source_url' if kind=='primary_policy' else 'invalid_url');result.append(row);continue
        if (item.get('policy_id',''),url) in seen:continue
        seen.add((item.get('policy_id',''),url))
        if kind=='primary_policy' and not is_official_url(url):
            row.update(status='needs_official_source_review',error='Host not in conservative government/institutional allowlist');result.append(row);continue
        old=by_url.get(sha_text(url))
        if old and not due_for_recheck(old,recheck_days):
            props=old.get('appProperties') or {}
            row.update(status='already_archived',drive_file_id=old['id'],sha256=props.get('sha256',''),bytes=old.get('size',''))
            result.append(row);continue
        if max_new is not None and new_count>=max_new and old is None:
            row.update(status='new_item_limit');result.append(row);continue
        head={}
        if old:
            props=old.get('appProperties') or {}
            if props.get('etag'):head['If-None-Match']=props['etag']
            if props.get('last_modified'):head['If-Modified-Since']=props['last_modified']
        local,info=retrieve(session,url,workdir,allow_html=(kind=='primary_policy'),
                            host_validator=is_official_url if kind=='primary_policy' else is_gccsi_url, headers=head)
        row.update({k:info.get(k,'') for k in ('http_status','format','bytes','sha256','resolved_url','error')})
        row['status']=info['status']
        try:
            if info['status']=='not_modified' and old:
                try:mark_checked(drive,old,info)
                except Exception as e:row['error']='mark_checked: '+str(e)[:180]
                row.update(status='not_modified',drive_file_id=old['id'],sha256=(old.get('appProperties') or {}).get('sha256',''))
            elif local:
                if old and (old.get('appProperties') or {}).get('sha256')==info['sha256']:
                    try:mark_checked(drive,old,info)
                    except Exception as e:row['error']='mark_checked: '+str(e)[:180]
                    row.update(status='unchanged_content',drive_file_id=old['id'])
                elif info['sha256'] in by_sha:
                    existing=by_sha[info['sha256']]
                    row.update(status='duplicate_content',drive_file_id=existing['id'])
                    # Persist alias for future runs, otherwise a deduplicated URL would be re-downloaded forever.
                    alias='source_url_alias_'+sha_text(url)[:14]
                    try:
                        props=dict(existing.get('appProperties') or {})
                        props[alias]=sha_text(url)
                        drive.files().update(fileId=existing['id'],body={'appProperties':props},fields='id,appProperties').execute()
                        existing['appProperties']=props
                        by_url[sha_text(url)]=existing
                    except Exception as exc:
                        row['error']='alias_persistence_failed: '+str(exc)[:160]
                else:
                    basename=source_name(url,kind,row['policy_id'])
                    # Actual source format is authoritative even if the landing URL has a misleading extension.
                    stem,ext=os.path.splitext(basename)
                    expected_ext='.'+info['format']
                    if ext.lower()!=expected_ext:
                        basename=stem+expected_ext
                    if basename in names:
                        stem,ext=os.path.splitext(basename)
                        basename=f'{stem}__{info["sha256"][:12]}{ext}'
                    try:
                        created=create_upload(drive,local,folder_id,basename,url,info['sha256'],row['policy_id'],kind,info['mime_type'],info)
                        row.update(status='uploaded_original',drive_file_id=created['id'])
                        by_url[sha_text(url)]=created;by_sha[info['sha256']]=created;names.add(basename);new_count+=1
                    except Exception as exc:
                        row.update(status='drive_upload_failed',error=f'{type(exc).__name__}: {str(exc)[:220]}')
        finally:
            if local and local.exists():local.unlink()
        result.append(row)
        if position%10==0:print(f'{kind} {position}: {Counter(x["status"] for x in result)}')
        time.sleep(PUBLISHER_DELAY_SECONDS)
    return result


def export_audit(drive,rows,prefix):
    if not rows:raise ValueError('Empty audit')
    from googleapiclient.http import MediaFileUpload
    ROOT.mkdir(parents=True,exist_ok=True)
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    path=ROOT/f'{prefix}_Audit_{stamp}.csv'
    keys=['collected_at','policy_id','country','title','publisher','source_type','inventory_sha256','url','status','http_status',
          'format','bytes','sha256','drive_file_id','resolved_url','error']
    with path.open('w',encoding='utf-8-sig',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=keys,extrasaction='ignore');writer.writeheader();writer.writerows(rows)
    media=MediaFileUpload(str(path),mimetype='text/csv',resumable=True)
    created=drive.files().create(body={'name':path.name,'parents':[METADATA_FOLDER_ID],
         'description':f'Immutable per-run {prefix} source archive audit with successful, skipped and failed sources'},
         media_body=media,fields='id,name,webViewLink').execute()
    print(f'COMPLETE: {len(rows)} source attempts; statuses: {dict(Counter(r["status"] for r in rows))}')
    print(f'AUDIT: https://drive.google.com/file/d/{created["id"]}/view')
    return created


def is_gccsi_url(url):
    p=urlsplit(url)
    return p.scheme=='https' and (p.hostname or '').lower() in ('globalccsinstitute.com','www.globalccsinstitute.com')


# Conservative official-host policy. This is a starting review filter, not evidence of legal authority.
OFFICIAL_HOSTS={
 'eur-lex.europa.eu','ec.europa.eu','commission.europa.eu','op.europa.eu',
 'legislation.gov.uk','www.legislation.gov.uk','gov.uk','www.gov.uk',
 'regjeringen.no','www.regjeringen.no','lovdata.no','www.lovdata.no',
 'canada.ca','www.canada.ca','laws-lois.justice.gc.ca','gazette.gc.ca',
 'ato.gov.au','legislation.gov.au','www.legislation.gov.au',
 'austlii.edu.au','www.austlii.edu.au','govinfo.gov','www.govinfo.gov',
 'gov.cn','www.gov.cn','mee.gov.cn','www.mee.gov.cn',
 'english.www.gov.cn','mof.gov.cn','ndrc.gov.cn',
 'meti.go.jp','www.meti.go.jp','e-gov.go.jp','elaws.e-gov.go.jp',
 'law.go.kr','www.law.go.kr','moleg.go.kr','www.moleg.go.kr',
 'gov.sg','www.gov.sg','sso.agc.gov.sg',
 'wipo.int','www.wipo.int','unfccc.int','www.unfccc.int',
 'imo.org','www.imo.org','un.org','www.un.org',
}
OFFICIAL_SUFFIXES=('.gov','.gov.uk','.gov.cn','.gov.au','.gov.sg','.gov.ca','.gouv.fr','.gob.mx','.go.jp','.go.kr','.europa.eu','.gc.ca','.admin.ch','.gov.br','.gov.in','.gov.za','.gov.ie','.gov.no')
EXTRA_OFFICIAL_HOSTS=set()  # Add hostnames only after manually verifying their source authority.

def is_official_url(url):
    p=urlsplit(url)
    if p.scheme!='https' or p.username or p.password:return False
    host=(p.hostname or '').lower()
    return (host in OFFICIAL_HOSTS or host in EXTRA_OFFICIAL_HOSTS
            or any(host.endswith(suffix) or host==suffix.lstrip('.') for suffix in OFFICIAL_SUFFIXES))


# ==== COLLECTION-SPECIFIC MODE ====
"""CCUS Policy Hub primary policy evidence acquisition, read-only vs canonical SQLite.

Use the repository's policy IDs and stored source URLs to preserve real originals.
This does NOT search policy names for plausible-looking documents or mutate SQLite.
"""

POLICY_RECHECK_DAYS = 30
POLICY_MAX_NEW_PER_RUN = None
# Optional Drive CSV with headers: policy_id,country,title,url,publisher.
# Put verified regulator/legislature primary-source URLs in this manual source queue.
POLICY_ADDITIONAL_TARGETS_CSV_ID = ''


def fetch_canonical_policies(session):
    ROOT.mkdir(parents=True,exist_ok=True)
    path=ROOT/'canonical_policy_snapshot.sqlite'
    r=session.get(GITHUB_DB_URL,stream=True,timeout=(15,120))
    r.raise_for_status()
    size=0
    with path.open('wb') as f:
        for chunk in r.iter_content(chunk_size=1024*1024):
            if not chunk:continue
            size+=len(chunk)
            if size>80*1024*1024:raise RuntimeError('Unexpectedly oversized SQLite source')
            f.write(chunk)
    with path.open('rb') as f:
        if f.read(16)!=b'SQLite format 3\x00':raise RuntimeError('GitHub response is not a SQLite database; stop')
    inventory_sha=hashlib.sha256(path.read_bytes()).hexdigest()
    print('Canonical policy DB SHA-256:',inventory_sha)
    db=sqlite3.connect('file:'+str(path)+'?mode=ro',uri=True)
    try:
        chk=db.execute('PRAGMA integrity_check').fetchone()
        if not chk or chk[0]!='ok':raise RuntimeError('Canonical SQLite integrity check failed')
        records=db.execute('''
          SELECT p.id,p.country,COALESCE(p.url,''),COALESCE(p.source,''),
                 COALESCE((SELECT i.title FROM policy_i18n i WHERE i.policy_id=p.id AND i.lang='en' LIMIT 1),p.id)
          FROM policies p ORDER BY p.id
        ''').fetchall()
    finally:
        db.close()
    if not records:raise RuntimeError('Canonical database returned zero policy records; stop')
    out=[]
    for policy_id,country,url,issuer,title in records:
        # 'source' is normally a citation/publisher, not a URL; never fabricate one.
        primary=url.strip() if url else ''
        if not primary and issuer.lower().startswith('https://'):primary=issuer.strip()
        out.append({'policy_id':policy_id,'country':country,'url':primary,'title':title,'publisher':issuer,'inventory_sha256':inventory_sha})
    print('Canonical policy records:',len(out), 'with URL:',sum(bool(x['url']) for x in out))
    return out


def manual_targets(drive):
    if not POLICY_ADDITIONAL_TARGETS_CSV_ID:return []
    from googleapiclient.http import MediaIoBaseDownload
    import io
    request=drive.files().get_media(fileId=POLICY_ADDITIONAL_TARGETS_CSV_ID)
    buf=io.BytesIO();downloader=MediaIoBaseDownload(buf,request)
    done=False
    while not done:_,done=downloader.next_chunk()
    reader=csv.DictReader(io.StringIO(buf.getvalue().decode('utf-8-sig')))
    required={'policy_id','url'}
    if not required.issubset(set(reader.fieldnames or [])):
        raise ValueError('Manual CSV must have policy_id and url headers')
    data=[]
    for row in reader:
        if row.get('policy_id','').strip() and row.get('url','').strip():
            data.append({'policy_id':row['policy_id'].strip(),'url':row['url'].strip(),
                        'country':row.get('country',''),'title':row.get('title',''),
                        'publisher':row.get('publisher','')})
    return data


def main():
    drive,docs=colab_services();sess=session_factory()
    try:targets=fetch_canonical_policies(sess)
    except Exception as exc:
        raise RuntimeError('Canonical policy DB is unavailable: cannot infer missing sources; no archive attempt.') from exc
    targets+=manual_targets(drive)
    rows=capture_targets(drive,sess,POLICY_FOLDER_ID,targets,'primary_policy',
                         recheck_days=POLICY_RECHECK_DAYS,max_new=POLICY_MAX_NEW_PER_RUN)
    export_audit(drive,rows,'Policy_Primary_Source')
    print('Primary evidence directory: https://drive.google.com/drive/folders/'+POLICY_FOLDER_ID)
    print('Important: missing_url / needs_official_source_review are explicit research backlog, not membership restrictions.')
    print('No automated SQLite mutation, legal-status inference or public republication is performed.')

if __name__=='__main__':main()
