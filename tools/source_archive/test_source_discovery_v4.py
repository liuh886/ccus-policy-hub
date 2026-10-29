"""Regression guardrails derived from real v3 Colab reviewer output.
Pure offline tests; never download a policy file or write to SQLite.
"""
import csv
from pathlib import Path
import ccus_policy_primary_archive as m


def test_real_v3_false_positives_blocked():
    p=Path(__file__).parent / 'v3_link_false_positives_fixture.csv'
    rows=list(csv.DictReader(p.open(encoding='utf-8-sig')))
    assert len(rows)>=9
    for r in rows:
        policy={'policy_id':r['policy_id'], 'title':r['policy_title'], 'url':r['canonical_url']}
        assert m.score_candidate(policy,r['candidate_url'],r['candidate_title'])==-1, r['policy_id']


def test_real_policy_document_and_old_version():
    p={'policy_id':'uk-industrial-carbon-capture-business-model-2025',
       'title':'UK Industrial Carbon Capture Business Model (2025)',
       'url':'https://www.gov.uk/government/publications/industrial-carbon-capture-business-model'}
    u='https://assets.publishing.service.gov.uk/media/60950c608fa8f548b0a95f0d/industrial-carbon-capture-icc.pdf'
    assert m.score_candidate(p,u,'Industrial carbon capture business model: May 2021 update')>0
    assert m.candidate_version_alignment(p,u,'Industrial carbon capture business model: May 2021 update')=='earlier_document_year_review'
    uk={'policy_id':'uk-energy-act-2023','title':'Energy Act 2023','url':'https://www.legislation.gov.uk/ukpga/2023/67/contents'}
    law='https://www.legislation.gov.uk/ukpga/2023/52/pdfs/ukpga_20230052_en.pdf'
    assert m.score_candidate(uk,law,'Energy Act 2023 enacted original PDF')>=20


def test_raw_archive_separate_from_link_discovery():
    policy={'policy_id':'nl-mining-act-co2-storage-2011','title':'Mijnbouwwet','url':'https://wetten.overheid.nl/BWBR0014168/', 'inventory_sha256':'h'*64}
    file={'id':'ACTUAL_ID','name':'document.html','mimeType':'text/html','size':'24000',
          'appProperties':{'policy_id':policy['policy_id']},'description':'RAW source. URL: https://wetten.overheid.nl/BWBR0014168/; SHA256:abc'}
    # Substantive file exists; there may be no link from its contents to an *additional* document.
    class Drive:
        class Req:
            def execute(self):return b'<html><a href="/">Home</a></html>'
        class Files:
            def get_media(self,**kw):return Drive.Req()
        def files(self):return Drive.Files()
    r=m.review_candidates_from_archives(Drive(),[policy],[{'policy_id':policy['policy_id'],'status':'already_archived','drive_file_id':'ACTUAL_ID'}],[file])
    assert len(r)==1 and r[0]['discovery_state']=='no_new_link_but_archived_raw'
    assert r[0]['archive_state']=='raw_candidate_archived'
    assert r[0]['archived_source_file_id']=='ACTUAL_ID'
    assert r[0]['instrument_match_review_state']=='not_reviewed'
    assert r[0]['candidate_type']=='no_new_link_candidate'


def test_no_file_creates_research_target_not_fake_url():
    policy={'policy_id':'uae-ccs-test','title':'CCS legal framework', 'country':'United Arab Emirates',
            'url':'https://www.moccae.gov.ae/','publisher':'Ministry','inventory_sha256':'abc'}
    audit=[{'policy_id':policy['policy_id'],'status':'source_too_broad'}]
    rows=m.review_candidates_from_archives(None,[policy],audit,[])
    research=m.make_research_backlog([policy],audit,[],rows)
    assert research[0]['research_priority']=='P0'
    assert research[0]['source_candidate_count']==0
    assert research[0]['publisher_lookup_route']=='issuer_official_registry_exact_title_number'
    assert research[0]['discovery_state']=='exact_source_lookup_needed'
    assert 'candidate_url' not in research[0]


def test_archive_legacy_broad_not_original():
    policy={'policy_id':'xx','url':'https://www.mee.gov.cn/'}
    r=m.policy_archive_state('xx',[{'policy_id':'xx','status':'source_too_broad'}],
       [{'id':'LEGACY','appProperties':{'policy_id':'xx'},'mimeType':'text/html'}])
    assert r['archive_state']=='raw_homepage_only'
    assert r['source_role']=='institutional_context'

if __name__=='__main__':
    for k,v in list(globals().items()):
        if k.startswith('test_') and callable(v):v();print('PASS',k)
