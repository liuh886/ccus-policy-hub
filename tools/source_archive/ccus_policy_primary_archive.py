"""Policy source acquisition and review queue (v4.1).

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
POLICY_RESEARCH_BACKLOG = True
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


# Keep generic organization/financial words out of the title-identity evidence.
STOP_TOKENS={'carbon','capture','storage','ccs','ccus','climate','change','energy','the','and',
    'policy','scheme','national','government','for','with','framework','programme','program',
    'report','of','act','law','regulation','directive','decree','legislation','bill','rules',
    'statute','brazil','brazilian','india','indian','united','states','british','united',
    'federal','agency','authority','ministry','resolution','tax','credit','incentive',
    'anp','irs','epa','doe','government','net','zero','2024','2025','2026','2023',
    '2022','2021','2020','2019','2027','2028','2029','2030','original','page'}
IRRELEVANT_LINK_RE = re.compile(
    r'(?i)(?:privacy|cookie|lgpd|governan[cç]a.{0,12}privacidade|termo[-_ ]?uso|'
    r'tax[-_ ]fraud|tax fraud|scam|child[-_ ]tax|child tax credit|earned[-_ ]income|'
    r'budget_at_glance|transfer.of.resources|contingency.fund|deficit.statistics|'
    r'/report-fraud/|governanca-privacidade)')
NAVIGATION_LINK_RE=re.compile(r'(?i)(?:expert.group|innovation.fund.projects|key.insights|calls.for.proposals|competitive.bidding|battery.booster)')
SUBJECT_GUARDS = {
    'br-anp-ccs-resolution': re.compile(r'(?i)(?:ccs|ccus|co2|carbon[o]?|captur[ae]|armazenamento|sequestro|14[._ -]?993)'),
    'us-45q-ira': re.compile(r'(?i)(?:45[ _-]?q|carbon.{0,24}(?:sequest|capture)|(?:sequest|capture).{0,24}carbon)'),
    'in-union-budget-2026-ccus': re.compile(r'(?i)(?:ccus|ccs|co2|carbon.{0,24}captur|captur.{0,24}carbon)'),
}


def _title_terms(value):
    return {v for v in re.findall(r'[a-z0-9]{3,}', (value or '').lower())
            if v not in STOP_TOKENS and not v.isdigit()}


def candidate_kind(url, anchor):
    content=(urlsplit(url).path+' '+anchor).lower()
    if re.search(r'\.(pdf|docx?)$',urlsplit(url).path,re.I):return 'document_file_candidate'
    if re.search(r'\b(act|statute|regulation|directive|decree|ordinance|legislation|law|code)\b', content):
        return 'legal_text_candidate'
    if re.search(r'\b(grant|subsidy|fund|programme|program|incentive|guidance)\b',content):
        return 'programme_or_guidance_candidate'
    return 'unspecified_webpage_candidate'


def candidate_version_alignment(policy, candidate_url, anchor):
    """Heuristic labels only; cannot establish enactment/consolidation/legal effect."""
    name=policy.get('title','')
    raw=' '.join([anchor or '',urlsplit(candidate_url).path])
    years=re.findall(r'(?<!\d)(?:19|20)\d{2}(?!\d)', name)
    years_seen=set(re.findall(r'(?<!\d)(?:19|20)\d{2}(?!\d)', raw))
    if not years:return 'no_policy_year'
    target=years[-1]
    if target in years_seen:return 'year_token_match_unverified'
    if years_seen and max(years_seen)<target:return 'earlier_document_year_review'
    if years_seen:return 'other_document_year_review'
    return 'publication_year_not_visible'


# These are candidate-stage descriptions, never legal identity/version approval.
LANGUAGE_SELECTOR_RE = re.compile(r'(?i)^\s*(?:bg|cs|da|de|el|en|es|et|fi|fr|ga|hr|hu|it|lt|lv|mt|nl|pl|pt|ro|sk|sl|sv)\s+[^/]{2,45}$')

def candidate_relation(policy, candidate_url, anchor, base_url=None):
    caption=' '.join((anchor or '').split())
    parsed=urlsplit(candidate_url)
    if LANGUAGE_SELECTOR_RE.fullmatch(caption):
        return 'navigation'
    if re.search(r'(?i)(?:select[-_ /]?language|language[-_ /]?selector)', parsed.path+' '+caption):
        return 'navigation'
    # Same registry identity with another internal HTML route is not a new Act.
    original=urlsplit(base_url or policy.get('url',''))
    if parsed.hostname==original.hostname and parsed.hostname in ('www.legislation.gov.au','legislation.gov.au'):
        identity=lambda path: re.search(r'(?i)/(C\d{4}[AC]\d+|F\d{4}[LC]\d+)(?:/|$)',path)
        left,right=identity(original.path),identity(parsed.path)
        if left and right and left[1].casefold()==right[1].casefold():
            return 'same_instrument_internal_section'
    if policy.get('policy_id')=='uk-industrial-carbon-capture-business-model-2025':
        text=caption+' '+parsed.path.rsplit('/',1)[-1]
        if not re.search(r'(?i)(?:industrial[ _-]+carbon[ _-]+capture|\bICC\b)',text):
            return 'related_secondary' if re.search(r'(?i)(?:dispatchable|transport|storage|business.model)',text) else 'unknown'
    if candidate_version_alignment(policy,candidate_url,anchor)=='earlier_document_year_review':
        return 'historical_version'
    title=' '.join(policy.get('title','').casefold().split())
    if len(title)>=12 and title in caption.casefold():
        return 'exact_instrument'
    return 'unknown'


def score_candidate(policy, candidate_url, anchor):
    """Candidate ranking only. Require identity clues; never use as legal authority score."""
    if not is_official_url(candidate_url) or url_scope(candidate_url)=='site_homepage':return -1
    if candidate_relation(policy,candidate_url,anchor)=='navigation':return -1
    path=urlsplit(candidate_url).path
    # Do not award title matches from a long shared portal prefix (EU Innovation Fund, etc.).
    # Only the anchor and the last URL path component are candidate-specific.
    context=' '.join((anchor or '',path.rstrip('/').rsplit('/',1)[-1]))
    if NAVIGATION_LINK_RE.search(context) and not NAVIGATION_LINK_RE.search(policy.get('title','')):return -1
    if IRRELEVANT_LINK_RE.search(context) and not IRRELEVANT_LINK_RE.search(policy.get('title','')):
        return -1
    # An exact named instrument in the anchor is stronger than generic token overlap.
    # Important for concise titles such as Energy Act 2023 (whose words are otherwise common).
    exact_title=' '.join(policy.get('title','').casefold().split())
    anchor_title=' '.join((anchor or '').casefold().split())
    if len(exact_title)>=12 and exact_title in anchor_title:
        edition=candidate_version_alignment(policy,candidate_url,anchor)
        return 83 if edition!='earlier_document_year_review' else 45
    guard=SUBJECT_GUARDS.get(policy.get('policy_id'))
    if guard and not guard.search(context):return -1
    matched=_title_terms(policy.get('title','')) & _title_terms(context)
    kind=candidate_kind(candidate_url,anchor)
    # A generic document at the correct publisher is not evidence of a specific policy.
    if len(matched)<2:
        # Specific instrument identifiers, where supplied in the canonical title, may substitute for words.
        identifiers=re.findall(r'(?<!\d)\d{2,5}(?:[.-]\d{1,5})?(?!\d)',policy.get('title',''))
        identifiers=[x for x in identifiers if x not in {'2024','2025','2026','2023','2022','2021','2020'}]
        exact=bool(identifiers and any(i in context for i in identifiers))
        if not exact:return -1
    score=min(65,len(matched)*18)
    if kind=='document_file_candidate':score+=12
    if kind=='legal_text_candidate':score+=9
    if kind=='programme_or_guidance_candidate':score+=3
    if urlsplit(candidate_url).hostname==urlsplit(policy.get('url','')).hostname:score+=3
    edition=candidate_version_alignment(policy,candidate_url,anchor)
    if edition=='earlier_document_year_review':score-=25
    elif edition=='other_document_year_review':score-=15
    elif edition=='year_token_match_unverified':score+=6
    return min(95,score) if score>=20 else -1


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
                   'version_alignment':candidate_version_alignment(policy,url,anchor),
                   'candidate_relation':candidate_relation(policy,url,anchor,base_url),
                   'relation_review_status':'not_reviewed',
                   'review_status':'pending','evidence_match_status':'unverified',
                   'research_note':'Link extracted from archived official HTML; existence and identity not checked.',
                   'inventory_sha256':policy.get('inventory_sha256','')}
        if url not in results or results[url]['match_score']<score:results[url]=candidate
    return sorted(results.values(),key=lambda r:(-r['match_score'],r['candidate_url']))[:max_candidates]


def policy_archive_state(policy_id, rows, files):
    """Archive transfer and candidate discovery are separate dimensions."""
    audit=[r for r in rows if r.get('policy_id')==policy_id and
           r.get('target_origin','canonical_db')=='canonical_db']
    current=audit[-1] if audit else {}
    attached=[f for f in files if (f.get('appProperties') or {}).get('policy_id')==policy_id]
    fid=current.get('drive_file_id') or (attached[0].get('id') if attached else '')
    status=current.get('status','unknown')
    if not fid:return {'archive_state':'no_raw_file','archived_source_file_id':'',
                       'source_role':'not_assessed','archive_audit_status':status}
    # A historical ministry-homepage snapshot must remain identifiable but not count as text.
    if status=='source_too_broad':
        return {'archive_state':'raw_homepage_only','archived_source_file_id':fid,
                'source_role':'institutional_context','archive_audit_status':status}
    return {'archive_state':'raw_candidate_archived','archived_source_file_id':fid,
            'source_role':'unverified_raw_source','archive_audit_status':status}


def publisher_lookup_route(policy):
    """An agent-ready research *hint*, never an invented search result or fetched URL."""
    from urllib.parse import urlsplit
    url=normalize_url(policy.get('url',''))
    host=urlsplit(url).hostname if url else ''
    country=(policy.get('country') or '').lower()
    if country=='european union' or host in ('eur-lex.europa.eu','op.europa.eu'):
        return 'eurlex_celex_or_eli_exact_identifier'
    if country=='united kingdom' or host.endswith('legislation.gov.uk'):
        return 'uk_legislation_exact_act_year_chapter'
    if country=='netherlands' or host.endswith('overheid.nl'):
        return 'nl_official_legislation_regulation_identifier'
    if country=='united states':
        return 'us_govinfo_ecfr_state_register_by_instrument'
    if country=='china':
        return 'cn_official_gazette_document_number_and_issuer'
    return 'issuer_official_registry_exact_title_number'


def make_research_backlog(canonical, rows, files, candidate_rows):
    by_id={r['policy_id']:r for r in canonical}
    number={}
    for r in candidate_rows:
        if r.get('candidate_url'):number[r['policy_id']]=number.get(r['policy_id'],0)+1
    result=[]
    for policy_id,policy in by_id.items():
        status=policy_archive_state(policy_id,rows,files)
        count=number.get(policy_id,0)
        instrument_gap=status['archive_state'] in ('no_raw_file','raw_homepage_only')
        priority=('P0' if instrument_gap and
                  status['archive_audit_status'] in ('source_too_broad','not_found','non_https_source')
                  else 'P1' if instrument_gap else 'P2')
        search_host=urlsplit(normalize_url(policy.get('url','')) or '').hostname or ''
        result.append({'policy_id':policy_id,'country':policy.get('country',''),
                       'policy_title':policy.get('title',''),'publisher':policy.get('publisher',''),
                       'canonical_url':policy.get('url',''),**status,
                       'source_candidate_count':count,
                       'discovery_state':'suggestions_pending_review' if count else
                          'homepage_only_exact_source_lookup_needed' if status['archive_state']=='raw_homepage_only' else
                          'no_new_link_but_archived_raw' if status['archive_state']!='no_raw_file'
                          else 'exact_source_lookup_needed',
                       'instrument_match_review_state':'not_reviewed',
                       'research_priority':priority,'publisher_lookup_route':publisher_lookup_route(policy),
                       'publisher_domain_hint':search_host,
                       'research_query':policy.get('title','')+' | '+policy.get('publisher',''),
                       'inventory_sha256':policy.get('inventory_sha256','')})
    return sorted(result,key=lambda r:(r['research_priority'],r['policy_id']))


def review_candidates_from_archives(drive,canonical,rows,files,read_limit=MAX_HTML_SNAPSHOTS_TO_SCAN):
    """Review-only: one row per policy minimum, with evidence state on every row."""
    by_id={p['policy_id']:p for p in canonical}
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
        description=file.get('description') or ''
        m=re.search(r'\bURL: (https://[^;\s]+); SHA256:', description)
        base_url=m.group(1) if m else by_id[policy_id]['url']
        if not is_official_url(base_url):continue
        try:
            page=drive.files().get_media(fileId=fid).execute()
            if not isinstance(page,bytes):continue
        except Exception:continue
        found=extract_official_link_candidates(page,base_url,by_id[policy_id],fid,MAX_CANDIDATES_PER_POLICY)
        output.extend(found);covered.update(r['policy_id'] for r in found)
    for seed in OFFICIAL_RESEARCH_SEEDS:
        policy=by_id.get(seed['policy_id'])
        if not policy:continue
        output.append({'policy_id':policy['policy_id'],'country':policy.get('country',''),
                       'policy_title':policy.get('title',''),'canonical_url':policy.get('url',''),
                       **seed,'source_origin':'official_research_seed',
                       'source_drive_file_id':'','match_score':'',
                       'version_alignment':candidate_version_alignment(policy,seed['candidate_url'],seed['candidate_title']),
                       'candidate_relation':candidate_relation(policy,seed['candidate_url'],seed['candidate_title']),
                       'relation_review_status':'not_reviewed',
                       'review_status':'pending','evidence_match_status':'unverified',
                       'inventory_sha256':policy.get('inventory_sha256','')})
        covered.add(policy['policy_id'])
    for policy in canonical:
        if policy['policy_id'] in covered:continue
        output.append({'policy_id':policy['policy_id'],'country':policy.get('country',''),
            'policy_title':policy.get('title',''),'canonical_url':policy.get('url',''),
            'candidate_url':'','candidate_title':'',
            'candidate_type':'no_new_link_candidate', 'source_edition':'',
            'source_origin':'research_backlog','source_drive_file_id':'',
            'match_score':'','review_status':'pending','evidence_match_status':'not_reviewed',
            'version_alignment':'not_applicable','candidate_relation':'unknown',
            'relation_review_status':'not_reviewed',
            'research_note':'No new outbound link discovered. Raw archive status is a separate field.',
            'inventory_sha256':policy.get('inventory_sha256','')})
    for row in output:
        state=policy_archive_state(row['policy_id'],rows,files)
        row.update(state)
        row['discovery_state']='suggestion_pending_review' if row.get('candidate_url') else (
            'no_new_link_but_archived_raw' if state['archive_state']!='no_raw_file' else 'exact_source_lookup_needed')
        row['instrument_match_review_state']='not_reviewed'
        row['publisher_lookup_route']=publisher_lookup_route(by_id[row['policy_id']])
    return sorted(output,key=lambda r:(r['policy_id'],not bool(r.get('candidate_url')),
                  -(int(r['match_score']) if str(r.get('match_score','')).isdigit() else 0),r.get('candidate_url','')))


def export_candidate_review_queue(drive,rows):
    from googleapiclient.http import MediaFileUpload
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    ROOT.mkdir(parents=True,exist_ok=True)
    file=ROOT/f'Policy_Source_Review_Candidates_{stamp}.csv'
    fields=['policy_id','country','policy_title','canonical_url','candidate_url','candidate_title',
        'candidate_type','source_edition','source_origin','source_drive_file_id','match_score',
        'review_status','evidence_match_status','research_note','inventory_sha256',
        'archive_state','archive_audit_status','archived_source_file_id','source_role',
        'discovery_state','instrument_match_review_state','version_alignment','candidate_relation','relation_review_status','publisher_lookup_route']
    with file.open('w',encoding='utf-8-sig',newline='') as out:
        writer=csv.DictWriter(out,fieldnames=fields,extrasaction='ignore')
        writer.writeheader();writer.writerows(rows)
    created=drive.files().create(body={'name':file.name,'parents':[METADATA_FOLDER_ID],
        'description':'Read-only evidence-aware source candidates. Always pending human review.'},
        media_body=MediaFileUpload(str(file),mimetype='text/csv',resumable=True),fields='id,name').execute()
    print(f'REVIEW QUEUE: {len(rows)} rows covering {len({x["policy_id"] for x in rows})} policy IDs; '
          f'https://drive.google.com/file/d/{created["id"]}/view')
    return created


def export_research_backlog(drive,records):
    from googleapiclient.http import MediaFileUpload
    stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    path=ROOT/f'Policy_Official_Registry_Research_Backlog_{stamp}.csv'
    fields=['policy_id','country','policy_title','publisher','canonical_url','archive_state',
        'archive_audit_status','archived_source_file_id','source_role','source_candidate_count',
        'discovery_state','instrument_match_review_state','research_priority',
        'publisher_lookup_route','publisher_domain_hint','research_query','inventory_sha256']
    with path.open('w',encoding='utf-8-sig',newline='') as out:
        w=csv.DictWriter(out,fieldnames=fields);w.writeheader();w.writerows(records)
    created=drive.files().create(body={'name':path.name,'parents':[METADATA_FOLDER_ID],
        'description':'Official registry research hints; no unverified URLs generated or fetched.'},
        media_body=MediaFileUpload(str(path),mimetype='text/csv',resumable=True),fields='id,name').execute()
    print(f'RESEARCH BACKLOG: {len(records)} policies; https://drive.google.com/file/d/{created["id"]}/view')
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
        if POLICY_RESEARCH_BACKLOG:
            export_research_backlog(drive,make_research_backlog(canonical,rows,preserved,candidate_rows))
    print('Primary evidence directory: https://drive.google.com/drive/folders/'+POLICY_FOLDER_ID)
    print('Important: source_too_broad / non_https_source / needs_official_source_review represent evidence gaps, not membership restrictions.')
    print('Any uploaded_original file is a raw archived source, not yet a legally verified policy instrument.')
    print('Review candidates are pending, never auto-downloaded or approved. No SQLite mutation or public republication.')

if __name__=='__main__':main()
