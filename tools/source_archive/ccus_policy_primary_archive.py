"""Policy source acquisition and review queue (v3).

Run next to archive_core.py (GitHub) or ccus_archive_core.py (Google Drive).
The Colab notebook embeds both modules and needs neither import.
No changes to the canonical policy SQLite.
"""
try:
    from archive_core import *
except ImportError:
    from ccus_archive_core import *


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
# An approved queue requires policy_id,url,review_status=approved,reviewer,source_edition.
# The discovery CSV is NOT an approved-targets file; never pass it here without review.
POLICY_REVIEW_CANDIDATES = True
MAX_HTML_SNAPSHOTS_TO_SCAN = 55
MAX_HTML_SOURCE_BYTES = 3500000
MAX_CANDIDATES_PER_POLICY = 6


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
    print('Canonical policy records:',len(out), 'with nonempty URL:',sum(bool(x['url']) for x in out),
          'with valid HTTPS URL:',sum(bool(normalize_url(x['url'])) for x in out))
    return out


def parse_approved_targets(reader, canonical_targets):
    required={'policy_id','url','review_status','reviewer','source_edition'}
    if not required.issubset(set(reader.fieldnames or [])):
        raise ValueError('Approved source CSV must have: '+', '.join(sorted(required)))
    ids={x['policy_id']:x for x in canonical_targets}
    data=[]
    for row in reader:
        policy_id=row.get('policy_id','').strip()
        if not policy_id:continue
        if policy_id not in ids:raise ValueError('Unknown policy ID in approval CSV: '+policy_id)
        if row.get('review_status','').strip().lower()!='approved':continue
        if not row.get('reviewer','').strip() or not row.get('source_edition','').strip():
            raise ValueError('Approved target needs reviewer + source_edition: '+policy_id)
        url=normalize_url(row.get('url',''))
        if not url or not is_official_url(url) or url_scope(url)=='site_homepage':
            raise ValueError('Approved target URL must be HTTPS, official and document-specific: '+policy_id)
        source=ids[policy_id]
        data.append({**source,'url':url,'target_origin':'manual_approved',
                     'source_edition':row['source_edition'].strip(),
                     'reviewer':row['reviewer'].strip()})
    return data


def manual_targets(drive, canonical_targets):
    """Only reviewed exact URLs, with policy IDs bound to canonical SQLite."""
    if not POLICY_ADDITIONAL_TARGETS_CSV_ID:return []
    from googleapiclient.http import MediaIoBaseDownload
    request=drive.files().get_media(fileId=POLICY_ADDITIONAL_TARGETS_CSV_ID)
    buf=io.BytesIO();downloader=MediaIoBaseDownload(buf,request)
    done=False
    while not done:_,done=downloader.next_chunk()
    reader=csv.DictReader(io.StringIO(buf.getvalue().decode('utf-8-sig')))
    return parse_approved_targets(reader,canonical_targets)


# Official verified reference candidates, kept in **review queue only**.
# They are NOT downloaded or inserted into SQLite automatically.
OFFICIAL_RESEARCH_SEEDS = [
    {'policy_id':'uk-energy-act-2023',
     'candidate_url':'https://www.legislation.gov.uk/ukpga/2023/52/pdfs/ukpga_20230052_en.pdf',
     'candidate_title':'Energy Act 2023 — chapter 52 (original enacted PDF)',
     'candidate_type':'original_enacted_legislation','source_edition':'original_enacted',
     'research_note':'Corrects invalid canonical 2023/67; confirm the required original vs current consolidated edition.'},
    {'policy_id':'us-epa-class-vi-primacy',
     'candidate_url':'https://www.epa.gov/uic/primary-enforcement-authority-underground-injection-control-program',
     'candidate_title':'US EPA UIC primacy programme explanation',
     'candidate_type':'regulator_guidance','source_edition':'current_webpage',
     'research_note':'Supporting context only. Not the statute, 40 CFR regulation or individual primacy approval.'},
    {'policy_id':'us-cifia-lpo',
     'candidate_url':'https://www.energy.gov/edf/carbon-dioxide-transportation-infrastructure-finance-and-innovation-program',
     'candidate_title':'US DOE CIFIA programme overview',
     'candidate_type':'programme_overview','source_edition':'current_webpage',
     'research_note':'Programme explanation, not legislative original. Do not reuse for us-iija-hubs without identity review.'},
]

from html.parser import HTMLParser
from urllib.parse import urljoin

class _SafeAnchorParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links=[];self.href=None;self.caption=[]
    def handle_starttag(self, tag, attrs):
        if tag.lower()=='a':
            attrs=dict(attrs);self.href=attrs.get('href');self.caption=[]
    def handle_data(self, data):
        if self.href is not None and len(' '.join(self.caption))<280:self.caption.append(data)
    def handle_endtag(self, tag):
        if tag.lower()=='a' and self.href is not None:
            self.links.append((self.href,' '.join(' '.join(self.caption).split())[:240]))
            self.href=None;self.caption=[]


STOP_TOKENS={'carbon','capture','storage','ccs','ccus','climate','change','energy','the','and',
             'policy','scheme','national','government','for','with','framework','2024','2025',
             '2026','programme','program','report','of','act','law','regulation','directive','decree',
             'legislation','bill','policy','rules','framework','statute'}


def _title_terms(value):
    return {v for v in re.findall(r'[a-z0-9]{3,}', (value or '').lower())
            if v not in STOP_TOKENS}


def candidate_kind(url, anchor):
    content=(urlsplit(url).path+' '+anchor).lower()
    if re.search(r'\.(pdf|docx?)($|\?)',urlsplit(url).path,re.I):return 'document_file_candidate'
    if re.search(r'\b(act|statute|regulation|directive|decree|ordinance|legislation|law|code)\b', content):
        return 'legal_text_candidate'
    if re.search(r'\b(grant|subsidy|fund|programme|program|incentive|guidance)\b',content):
        return 'programme_or_guidance_candidate'
    return 'unspecified_webpage_candidate'


def score_candidate(policy, candidate_url, anchor):
    """Ranking, NOT legal-authenticity confidence. Do not use to auto-approve."""
    if not is_official_url(candidate_url) or url_scope(candidate_url)=='site_homepage':return -1
    terms=_title_terms(policy.get('title',''))
    context=(anchor+' '+urlsplit(candidate_url).path).lower()
    matched=[t for t in terms if t in _title_terms(context)]
    score=min(48,len(matched)*12)
    kind=candidate_kind(candidate_url,anchor)
    if kind=='document_file_candidate':score+=22
    if kind=='legal_text_candidate':score+=14
    if kind=='programme_or_guidance_candidate':score+=5
    if urlsplit(candidate_url).hostname==urlsplit(policy.get('url','')).hostname:score+=5
    # Require distinctive title evidence, or file-like law/regulation hint; reject generic navigation.
    if not matched:return -1  # Generic law/ministry keywords alone are never enough to link to a policy.
    if len(matched)==1 and kind=='unspecified_webpage_candidate':return -1
    return min(score,99)


def extract_official_link_candidates(html_bytes,base_url,policy,source_file_id,max_candidates=6):
    """Read already-archived HTML once, do not crawl or fetch linked sites."""
    if not base_url or not is_official_url(base_url):return []
    parser=_SafeAnchorParser()
    try:parser.feed(html_bytes.decode('utf-8',errors='replace'))
    except Exception:return []
    results={}
    for href,anchor in parser.links[:2500]:
        if not href or len(href)>1600:continue
        url=normalize_url(urljoin(base_url,href))
        if not url or url==normalize_url(base_url):continue
        # Anchor suggestions are for human review; neither cross-domain navigation nor SSL failure may trigger downloads.
        score=score_candidate(policy,url,anchor)
        if score<20:continue
        # A law may reside on a different official publisher host, but still requires manual verification.
        candidate={'policy_id':policy['policy_id'],'country':policy.get('country',''),
                   'policy_title':policy.get('title',''),'canonical_url':policy.get('url',''),
                   'candidate_url':url,'candidate_title':anchor,
                   'candidate_type':candidate_kind(url,anchor),
                   'source_edition':'unknown','source_origin':'archived_official_html_link',
                   'source_drive_file_id':source_file_id,'match_score':score,
                   'review_status':'pending','evidence_match_status':'unverified',
                   'research_note':'Link extracted from archived official HTML; existence and identity not checked.',
                   'inventory_sha256':policy.get('inventory_sha256','')}
        if url not in results or results[url]['match_score']<score:results[url]=candidate
    return sorted(results.values(),key=lambda r:(-r['match_score'],r['candidate_url']))[:max_candidates]


def review_candidates_from_archives(drive,canonical,rows,files,read_limit=MAX_HTML_SNAPSHOTS_TO_SCAN):
    """Produce a non-executing, per-policy review queue; no SQLite or evidence-file writes."""
    by_id={p['policy_id']:p for p in canonical}
    last_status={r['policy_id']:r['status'] for r in rows if r['policy_id'] in by_id and r.get('target_origin','canonical_db')=='canonical_db'}
    output=[];covered=set();seen_file=set()
    for file in sorted(files,key=lambda f:f.get('name','')):
        props=file.get('appProperties') or {}
        policy_id=props.get('policy_id','')
        if policy_id not in by_id or file.get('mimeType')!='text/html':continue
        if len(seen_file)>=read_limit:break
        size=int(file.get('size') or 0)
        if size<500 or size>MAX_HTML_SOURCE_BYTES:continue
        fid=file.get('id')
        if fid in seen_file:continue
        seen_file.add(fid)
        # Source URL must come from provenance written on initial upload, never from user HTML.
        description=file.get('description') or ''
        m=re.search(r'\bURL: (https://[^;\s]+); SHA256:', description)
        base_url=m.group(1) if m else by_id[policy_id]['url']
        if not is_official_url(base_url):continue
        try:
            page=drive.files().get_media(fileId=fid).execute()
            if not isinstance(page,bytes):continue
        except Exception:continue  # An inaccessible snapshot must not block the remaining queue.
        found=extract_official_link_candidates(page,base_url,by_id[policy_id],fid,MAX_CANDIDATES_PER_POLICY)
        output.extend(found);covered.update(r['policy_id'] for r in found)
    # Three researched URLs are suggestions, not approved downloads.
    for seed in OFFICIAL_RESEARCH_SEEDS:
        policy=by_id.get(seed['policy_id'])
        if not policy:continue
        output.append({**{k:policy.get(k,'') for k in ()},
                       'policy_id':policy['policy_id'],'country':policy.get('country',''),
                       'policy_title':policy.get('title',''),'canonical_url':policy.get('url',''),
                       **seed,'source_origin':'official_research_seed',
                       'source_drive_file_id':'','match_score':'',
                       'review_status':'pending','evidence_match_status':'unverified',
                       'inventory_sha256':policy.get('inventory_sha256','')})
        covered.add(policy['policy_id'])
    # Every canonical policy ID appears at least once, including no-candidate rows.
    for policy in canonical:
        if policy['policy_id'] in covered:continue
        output.append({'policy_id':policy['policy_id'],'country':policy.get('country',''),
            'policy_title':policy.get('title',''),'canonical_url':policy.get('url',''),
            'candidate_url':'','candidate_title':'','candidate_type':'no_candidate_yet',
            'source_edition':'','source_origin':'research_backlog','source_drive_file_id':'',
            'match_score':'','review_status':'pending','evidence_match_status':'not_found',
            'research_note':f'Latest archive status: {last_status.get(policy["policy_id"], "unknown")}. Research an exact source and edition.',
            'inventory_sha256':policy.get('inventory_sha256','')})
    # Stable order, idempotent contents except timestamps in audit filename.
    return sorted(output,key=lambda r:(r['policy_id'],str(r.get('match_score',''))== '',-(r['match_score'] or 0) if isinstance(r.get('match_score'),int) else 0,r.get('candidate_url','')))


def export_candidate_review_queue(drive,rows):
    from googleapiclient.http import MediaFileUpload
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    ROOT.mkdir(parents=True,exist_ok=True)
    file=ROOT/f'Policy_Source_Review_Candidates_{stamp}.csv'
    fields=['policy_id','country','policy_title','canonical_url','candidate_url','candidate_title',
        'candidate_type','source_edition','source_origin','source_drive_file_id','match_score',
        'review_status','evidence_match_status','research_note','inventory_sha256']
    with file.open('w',encoding='utf-8-sig',newline='') as out:
        writer=csv.DictWriter(out,fieldnames=fields,extrasaction='ignore')
        writer.writeheader();writer.writerows(rows)
    created=drive.files().create(body={'name':file.name,'parents':[METADATA_FOLDER_ID],
        'description':'Read-only official source candidates. All entries pending human review; do NOT pass as approved targets.'},
        media_body=MediaFileUpload(str(file),mimetype='text/csv',resumable=True),fields='id,name').execute()
    print(f'REVIEW QUEUE: {len(rows)} rows covering {len({x["policy_id"] for x in rows})} policy IDs; '
          f'https://drive.google.com/file/d/{created["id"]}/view')
    return created


def main():
    drive,docs=colab_services();sess=session_factory()
    try:targets=fetch_canonical_policies(sess)
    except Exception as exc:
        raise RuntimeError('Canonical policy DB is unavailable: cannot infer missing sources; no archive attempt.') from exc
    approved=manual_targets(drive,targets)
    canonical=targets
    targets=canonical+approved
    rows=capture_targets(drive,sess,POLICY_FOLDER_ID,targets,'primary_policy',
                         recheck_days=POLICY_RECHECK_DAYS,max_new=POLICY_MAX_NEW_PER_RUN)
    export_audit(drive,rows,'Policy_Primary_Source')
    if POLICY_REVIEW_CANDIDATES:
        preserved=list_folder(drive,POLICY_FOLDER_ID)
        candidate_rows=review_candidates_from_archives(drive,canonical,rows,preserved)
        export_candidate_review_queue(drive,candidate_rows)
    print('Primary evidence directory: https://drive.google.com/drive/folders/'+POLICY_FOLDER_ID)
    print('Important: source_too_broad / non_https_source / needs_official_source_review represent evidence gaps, not membership restrictions.')
    print('Any uploaded_original file is a raw archived source, not yet a legally verified policy instrument.')
    print('Review candidates are pending, never auto-downloaded or approved. No SQLite mutation or public republication.')

if __name__=='__main__':main()
