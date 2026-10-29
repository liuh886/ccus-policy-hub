import io,sys,tempfile,hashlib
from pathlib import Path
from unittest.mock import Mock
sys.path.insert(0,str(Path(__file__).parent))
import archive_core as x

def test_normalize():
    assert x.normalize_url('https://www.gov.uk/law.pdf?x=2#abc')=='https://www.gov.uk/law.pdf?x=2'
    assert x.normalize_url('http://www.gov.uk/law.pdf') is None
    assert x.normalize_url('https://attacker@www.gov.uk/foo') is None
    assert x.normalize_url('javascript:alert(1)') is None

def test_hosts():
    assert x.is_official_url('https://eur-lex.europa.eu/legal-content/en/TXT/?uri=CELEX:32009L0031')
    assert x.is_official_url('https://www.epa.gov/ghgreporting/subpart-rr')
    assert x.is_official_url('https://www.mee.gov.cn/xxgk/file.pdf')
    assert not x.is_official_url('https://www.globalccsinstitute.com/x.pdf')
    assert not x.is_official_url('https://gov.uk.example.net/law.pdf')
    assert not x.is_official_url('https://www.legislation.gov.uk.evil.com/path')

def test_blob():
    with tempfile.TemporaryDirectory() as d:
        f=Path(d)/'test.html';f.write_text('<!doctype html><html><body>'+('Genuine regulation text.'*110)+'</body></html>')
        assert x.blob_type(f,b'<!doctype html>','text/html',True)[0]=='html'
        assert x.blob_type(f,b'<!doctype html>','text/html',False)[0]=='not_document'
        f.write_text('<html>'+('Sign in to continue'*60)+'</html>')
        assert x.blob_type(f,b'<html>','text/html',True)[0]=='blocked_html'
        f.write_bytes(b'%PDF-1.7'+b'x'*5000)
        assert x.blob_type(f,b'%PDF-1.7','application/octet-stream',False)[0]=='pdf'

def test_existing():
    files=[{'id':'A','name':'one.pdf','appProperties':{'sha256':'abc','source_url_sha256':'1'*64,'source_url_alias_aaaa':'2'*64},'createdTime':'2026-10-29T00:00:00Z'}]
    urls,shas,names=x.existing_indices(files)
    assert urls['1'*64]['id']=='A' and urls['2'*64]['id']=='A'
    assert shas['abc']['name']=='one.pdf' and 'one.pdf' in names
    assert x.due_for_recheck(files[0],45)==False

def test_sniff_document_reject():
    class Reply:
        status_code=200;url='https://www.epa.gov/rules.pdf';headers={'Content-Type':'text/html'}
        def __enter__(self):return self
        def __exit__(self,*a):pass
        def iter_content(self,chunk_size=100):yield b'<html><form><input type="password">'+b'a'*1000
    class Session:
        def get(self,*args,**kw):return Reply()
    with tempfile.TemporaryDirectory() as d:
        file,info=x.retrieve(Session(),'https://www.epa.gov/rules.pdf',Path(d),True,x.is_official_url)
        assert file is None and info['status']=='blocked_html'


def test_policy_source_gate():
    assert x.is_official_url('https://www.alberta.ca/technology-innovation-and-emissions-reduction-regulation')
    assert x.is_official_url('https://ens.dk/en/our-responsibilities/ccs')
    assert x.is_official_url('https://wetten.overheid.nl/BWBR0014168/')
    assert x.is_official_url('https://www.moccae.gov.ae/')
    assert x.is_official_url('https://www.resmigazete.gov.tr/fihrist?tarih=2026')
    assert not x.is_official_url('https://alberta.ca.evil.example/regulation')
    assert not x.is_official_url('https://www.verra.org/methodology')  # private standards need separate issuer review
    assert x.url_scope('https://www.mee.gov.cn/')=='site_homepage'
    assert x.url_scope('https://www.mee.gov.cn/policy/detail/123.html')=='specific_document_or_page_candidate'
    assert x.policy_source_relevance_status('https://www.mee.gov.cn/','primary_policy')=='not_an_instrument'
    assert x.url_scope('http://www.shandong.gov.cn/')=='invalid_or_non_https'


def test_http_202_and_limited_retries():
    class Reply:
        status_code=202; url='https://eur-lex.europa.eu/eli/dir/2009/31/oj'; headers={}
        def __enter__(self):return self
        def __exit__(self,*a):pass
    class Session:
        def get(self,*args,**kwargs):
            assert kwargs['timeout']==x.REQUEST_TIMEOUT
            return Reply()
    with tempfile.TemporaryDirectory() as d:
        file,info=x.retrieve(Session(),Reply.url,Path(d),True,x.is_official_url)
        assert file is None and info['status']=='http_202_not_document'


def test_reject_site_homepage_without_download():
    class Drive:
        class Files:
            def list(self,**kwargs):return self
            def execute(self):return {'files':[]}
        def files(self):return self.Files()
    class Session:
        def get(self,*args,**kwargs):raise AssertionError('must never fetch government homepage')
    data=[{'policy_id':'test','url':'https://www.mee.gov.cn/'}]
    rows=x.capture_targets(Drive(),Session(),'test_folder',data,'primary_policy')
    assert len(rows)==1 and rows[0]['status']=='source_too_broad'
    assert rows[0]['instrument_verification']=='not_an_instrument'




def test_policy_discovery_links():
    import ccus_policy_primary_archive as m
    html=b'''<html><body>
      <a href="/ukpga/2023/52/pdfs/ukpga_20230052_en.pdf">Energy Act 2023 enacted original PDF</a>
      <a href="https://evil.example/energy-act-2023.pdf">Energy Act 2023</a>
      <a href="javascript:alert(1)">Energy Act 2023</a>
      <a href="/">Energy Act 2023 homepage</a>
      <a href="/about">About us</a>
      </body></html>'''
    policy={'policy_id':'uk-energy-act-2023','title':'Energy Act 2023','url':'https://www.legislation.gov.uk/'}
    c=m.extract_official_link_candidates(html,policy['url'],policy,'D')
    assert len(c)==1 and c[0]['candidate_url'].endswith('/ukpga/2023/52/pdfs/ukpga_20230052_en.pdf')
    assert c[0]['review_status']=='pending'
    assert c[0]['source_drive_file_id']=='D'
    assert c[0]['evidence_match_status']=='unverified'


def test_policy_discovery_no_auto_fetch():
    import ccus_policy_primary_archive as m
    import hashlib
    from urllib.parse import urlsplit
    sample=b'<html><a href="/ukpga/2023/52/pdfs/ukpga_20230052_en.pdf">Energy Act 2023 enacted PDF</a></html>'
    policy={'policy_id':'uk-energy-act-2023','title':'Energy Act 2023','country':'United Kingdom',
            'url':'https://www.legislation.gov.uk/ukpga/2023/67/contents','inventory_sha256':'h'*64}
    class Request:
        def execute(self):return sample
    class Drive:
        class Files:
            def get_media(self,**kw):return Request()
        def files(self):return self.Files()
    file={'id':'DRIVE_ID','name':'archived.html','mimeType':'text/html','size':'5000',
          'appProperties':{'policy_id':'uk-energy-act-2023'},
          'description':'RAW source. URL: https://www.legislation.gov.uk/; SHA256: abc'}
    rows=m.review_candidates_from_archives(Drive(),[policy],
        [{'policy_id':'uk-energy-act-2023','status':'not_found','target_origin':'canonical_db'}],[file])
    assert rows and {r['policy_id'] for r in rows}=={'uk-energy-act-2023'}
    assert any(r['source_origin']=='archived_official_html_link' for r in rows)
    assert any(r['source_origin']=='official_research_seed' for r in rows)
    assert all(r['review_status']=='pending' for r in rows)


def test_review_no_candidates_includes_all():
    import ccus_policy_primary_archive as m
    class Drive:
        def files(self):raise AssertionError('No files should be fetched without source archive')
    p={'policy_id':'unknown-law','title':'Unknown law','url':'https://www.gov.uk/'}
    r=m.review_candidates_from_archives(Drive(),[p],[{'policy_id':p['policy_id'],'status':'source_too_broad'}],[])
    assert len(r)==1 and r[0]['candidate_type']=='no_new_link_candidate'
    assert r[0]['archive_audit_status']=='source_too_broad' and r[0]['archive_state']=='no_raw_file'


def test_candidate_distinctive_terms():
    import ccus_policy_primary_archive as m
    assert m.score_candidate({'title':'Energy Act 2023','url':'https://www.legislation.gov.uk/'},
           'https://www.legislation.gov.uk/ukpga/2023/52/pdfs/ukpga_20230052_en.pdf',
           'Energy Act 2023 Original PDF')>=20
    assert m.score_candidate({'title':'Energy Act 2023','url':'https://www.legislation.gov.uk/'},
           'https://www.legislation.gov.uk/about','Contact')==-1
    assert m.score_candidate({'title':'Energy Act 2023','url':'https://www.legislation.gov.uk/'},
           'https://legislation.gov.uk.evil.example/ukpga/2023/52.pdf','Energy Act 2023')==-1


def test_policy_approved_csv_is_reviewed():
    import ccus_policy_primary_archive as m
    import csv
    from io import StringIO
    data='policy_id,url,review_status,reviewer,source_edition\nuk-energy-act-2023,https://www.legislation.gov.uk/ukpga/2023/52/pdfs/ukpga_20230052_en.pdf,approved,analyst,original_enacted\n'
    canonical=[{'policy_id':'uk-energy-act-2023','url':'https://www.legislation.gov.uk/ukpga/2023/67','title':'Energy Act 2023','country':'United Kingdom','inventory_sha256':'abc'}]
    r=m.parse_approved_targets(csv.DictReader(StringIO(data)),canonical)
    assert len(r)==1 and r[0]['target_origin']=='manual_approved'
    assert r[0]['inventory_sha256']=='abc' and r[0]['source_edition']=='original_enacted'
    bad='policy_id,url,review_status,reviewer,source_edition\nuk-energy-act-2023,https://evil.example/law.pdf,approved,analyst,current\n'
    try:m.parse_approved_targets(csv.DictReader(StringIO(bad)),canonical)
    except ValueError:pass
    else:raise AssertionError('Nonofficial reviewed source accepted')
    unknown='policy_id,url,review_status,reviewer,source_edition\nunknown-policy,https://www.legislation.gov.uk/x.pdf,approved,analyst,current\n'
    try:m.parse_approved_targets(csv.DictReader(StringIO(unknown)),canonical)
    except ValueError:pass
    else:raise AssertionError('Unknown policy ID accepted')


def test_no_generic_law_false_positive():
    import ccus_policy_primary_archive as m
    score=m.score_candidate({"title":"Poland Mining Law CCS 2024","url":"https://www.gov.pl/web/klimat"},
        "https://www.gov.pl/web/klimat/nrl","Obudowa Zasobów Przyrody - Nature Restoration Law")
    assert score==-1


if __name__=="__main__":
    for key,fn in list(globals().items()):
        if key.startswith("test_") and callable(fn):
            fn();print("PASS",key)
