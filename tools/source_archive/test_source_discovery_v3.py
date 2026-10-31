"""Offline v3 source discovery tests. No Google OAuth required."""
import csv
from io import StringIO
from ccus_policy_primary_archive import (
    score_candidate, extract_official_link_candidates,
    parse_approved_targets, review_candidates_from_archives,
)

def test_official_exact_file_and_unsafe_urls():
    p = {'policy_id':'uk-energy-act-2023','title':'Energy Act 2023',
         'url':'https://www.legislation.gov.uk/'}
    html = (b'<a href="/ukpga/2023/52/pdfs/ukpga_20230052_en.pdf">Energy Act 2023 PDF</a>'
            b'<a href="https://evil.invalid/energy-act.pdf">Energy Act 2023</a>')
    rows = extract_official_link_candidates(html, p['url'], p, 'FILE1')
    assert len(rows) == 1 and rows[0]['review_status'] == 'pending'
    assert rows[0]['evidence_match_status'] == 'unverified'
    assert rows[0]['source_drive_file_id'] == 'FILE1'

def test_unrelated_generic_law():
    p = {'title':'Poland Mining Law CCS 2024','url':'https://www.gov.pl/web/klimat'}
    assert score_candidate(
        p, 'https://www.gov.pl/web/klimat/nrl',
        'Nature Restoration Law') == -1

def test_approval_requires_canonical_record():
    canonical = [{'policy_id':'uk-energy-act-2023','title':'Energy Act 2023',
                  'inventory_sha256':'hash',
                  'url':'https://www.legislation.gov.uk/ukpga/2023/67/contents'}]
    good = ('policy_id,url,review_status,reviewer,source_edition\n'
            'uk-energy-act-2023,https://www.legislation.gov.uk/ukpga/2023/52/'
            'pdfs/ukpga_20230052_en.pdf,approved,human,original_enacted\n')
    rows = parse_approved_targets(csv.DictReader(StringIO(good)), canonical)
    assert len(rows) == 1 and rows[0]['target_origin'] == 'manual_approved'
    bad = good.replace('uk-energy-act-2023', 'not-a-policy')
    try:parse_approved_targets(csv.DictReader(StringIO(bad)), canonical)
    except ValueError:pass
    else:raise AssertionError('Unknown policy ID accepted')

def test_review_queue_includes_all():
    p = {'policy_id':'not-yet-verified','title':'Unverified programme',
         'url':'https://www.gov.uk/'}
    r = review_candidates_from_archives(None, [p], [
        {'policy_id':p['policy_id'],'status':'source_too_broad'}], [])
    assert len(r) == 1 and r[0]['candidate_type'] == 'no_new_link_candidate'

if __name__ == '__main__':
    for k,v in list(globals().items()):
        if k.startswith('test_') and callable(v):v();print('PASS',k)
