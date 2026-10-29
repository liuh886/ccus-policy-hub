"""Recurring GCCSI report archive source (v3).
Run next to archive_core.py; Colab notebook embeds the complete core.
"""
from archive_core import *


# ==== COLLECTION-SPECIFIC MODE ====
"""GCCSI_incremental v2.1. Main source: official PDF links and the Drive catalog.
Change RECHECK_DAYS or discovery limits below if needed.
"""
from bs4 import BeautifulSoup

GCCSI_ROOT = 'https://www.globalccsinstitute.com'
PUBLICATIONS_PAGES = 7
WP_MEDIA_MAX_PAGES = 25
DISCOVER_PUBLICATIONS = True
DISCOVER_WP_MEDIA = True
GCCSI_RECHECK_DAYS = 45
GCCSI_MAX_NEW_PER_RUN = None  # e.g. 20 for a short incremental run


def get_catalog_urls(docs):
    doc=docs.documents().get(documentId=GCCSI_CATALOG_ID,includeTabsContent=True).execute()
    chunks=[]
    def walk(v):
        if isinstance(v,dict):
            if 'textRun' in v:chunks.append(v['textRun'].get('content',''))
            for k,part in v.items():
                if k != 'textRun':walk(part)
        elif isinstance(v,list):
            for part in v:walk(part)
    walk(doc.get('body',{}).get('content',[]))
    walk(doc.get('tabs',[]))
    raw=''.join(chunks)
    urls=set()
    for found in re.findall(r'https://(?:www\.)?globalccsinstitute\.com/wp-content/uploads/[^\s<>]+?\.pdf',raw,re.I):
        u=normalize_url(found)
        if u and is_gccsi_url(u):urls.add(u)
    return urls


def pdfs_from_html(raw,base):
    from urllib.parse import urljoin
    soup=BeautifulSoup(raw,'html.parser');results=set()
    for el in soup.select('a[href],iframe[src],embed[src],object[data],link[href]'):
        val=el.get('href') or el.get('src') or el.get('data')
        if not val:continue
        u=normalize_url(urljoin(base,val))
        if u and is_gccsi_url(u) and urlsplit(u).path.lower().endswith('.pdf'):
            results.add(u)
    return results,soup


def discover_gccsi(session):
    urls=set();article_urls=set()
    if DISCOVER_PUBLICATIONS:
        for i in range(1,PUBLICATIONS_PAGES+1):
            page=f'{GCCSI_ROOT}/publications/' if i==1 else f'{GCCSI_ROOT}/publications/page/{i}/'
            try:
                r=session.get(page,timeout=(12,55));r.raise_for_status()
                new,soup=pdfs_from_html(r.text,page);urls.update(new)
                for a in soup.select('a[href]'):
                    u=normalize_url(__import__('urllib.parse',fromlist=['urljoin']).urljoin(page,a.get('href','')))
                    if u and u.startswith(GCCSI_ROOT+'/publications/') and re.search(r'/publications/[^/?#]+/?$',u):article_urls.add(u)
            except Exception as exc:print('GCCSI listing unavailable:',page,str(exc)[:100])
            time.sleep(PUBLISHER_DELAY_SECONDS)
        for n,page in enumerate(sorted(article_urls),1):
            try:
                r=session.get(page,timeout=(12,55));r.raise_for_status()
                new,_=pdfs_from_html(r.text,page);urls.update(new)
            except Exception as exc:print('GCCSI article unavailable:',page,str(exc)[:100])
            time.sleep(PUBLISHER_DELAY_SECONDS)
            if n%25==0:print('Publication details scanned:',n)
    if DISCOVER_WP_MEDIA:
        for page in range(1,WP_MEDIA_MAX_PAGES+1):
            try:
                r=session.get(GCCSI_ROOT+'/wp-json/wp/v2/media',params={'per_page':100,'page':page,'media_type':'application'},timeout=(12,55))
                if r.status_code in (400,401,403,404):
                    print('Public WP media endpoint unavailable:',r.status_code);break
                r.raise_for_status();records=r.json()
                if not isinstance(records,list) or not records:break
                for x in records:
                    v=x.get('source_url') or x.get('guid',{}).get('rendered','')
                    u=normalize_url(v)
                    if u and is_gccsi_url(u) and urlsplit(u).path.lower().endswith('.pdf'):urls.add(u)
                if len(records)<100:break
                time.sleep(PUBLISHER_DELAY_SECONDS)
            except Exception as exc:
                print('WP media discovery unavailable:',str(exc)[:160]);break
    return urls


def main():
    drive,docs=colab_services();session=session_factory()
    urls=set()
    try:
        urls.update(get_catalog_urls(docs))
    except Exception as exc:
        print('Catalog read error; discovery will still be attempted:',str(exc)[:240])
    urls.update(discover_gccsi(session))
    targets=[{'url':u,'publisher':'Global CCS Institute','title':safe_filename(urlsplit(u).path.rsplit('/',1)[-1])} for u in sorted(urls)]
    if not targets:raise RuntimeError('No GCCSI source URLs found; no upload attempted.')
    print('Discovered unique official GCCSI PDF links:',len(targets))
    rows=capture_targets(drive,session,GCCSI_FOLDER_ID,targets,'secondary_report',
                         recheck_days=GCCSI_RECHECK_DAYS,max_new=GCCSI_MAX_NEW_PER_RUN)
    export_audit(drive,rows,'GCCSI_Incremental')
    print('Verified destination: https://drive.google.com/drive/folders/'+GCCSI_FOLDER_ID)

if __name__=='__main__':main()
