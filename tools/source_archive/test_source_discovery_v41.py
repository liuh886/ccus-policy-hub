"""v4.1 regressions; offline fixtures do not establish live source coverage."""
import csv
from pathlib import Path
import ccus_policy_primary_archive as m


def test_eight_homepage_files_are_p0_instrument_gaps():
    with (Path(__file__).parent / 'v41_homepage_priority_fixture.csv').open(encoding='utf-8') as f:
        cases = list(csv.DictReader(f))
    assert len(cases) == 8
    for case in cases:
        policy = {'policy_id': case['policy_id'], 'url': 'https://example.org/', 'title': 'Fixture'}
        file = {'id': case['drive_file_id'], 'appProperties': {'policy_id': case['policy_id']}}
        result = m.make_research_backlog([policy], [case], [file], [])[0]
        assert result['archive_state'] == 'raw_homepage_only'
        assert result['research_priority'] == 'P0'
        assert result['discovery_state'] == 'homepage_only_exact_source_lookup_needed'
        assert result['instrument_match_review_state'] == 'not_reviewed'


def test_eu_language_selectors_are_not_sources():
    policy = {'policy_id': 'eu-innovation-fund', 'title': 'EU Innovation Fund',
              'url': 'https://climate.ec.europa.eu/eu-action/funding-climate-action/innovation-fund_en'}
    for label, language in [('bg български', 'bg'), ('cs čeština', 'cs'), ('da dansk', 'da'),
                            ('de Deutsch', 'de'), ('el ελληνικά', 'el')]:
        url = policy['url'][:-2] + language
        assert m.candidate_relation(policy, url, label) == 'navigation'
        assert m.score_candidate(policy, url, label) == -1
    html = ''.join(f'<a href="{policy["url"][:-2] + lang}">{label}</a>'
                   for label, lang in [('bg български', 'bg'), ('de Deutsch', 'de')])
    assert m.extract_official_link_candidates(html.encode(), policy['url'], policy, 'FIXTURE') == []


def test_related_models_internal_sections_and_year_tokens_do_not_verify_identity():
    policy = {'policy_id': 'uk-industrial-carbon-capture-business-model-2025',
              'title': 'UK Industrial Carbon Capture Business Model (2025)',
              'url': 'https://www.gov.uk/government/publications/industrial-carbon-capture-business-model'}
    url = 'https://www.gov.uk/government/publications/dispatchable-power-agreement-business-model'
    assert m.candidate_relation(policy, url, 'Dispatchable Power Agreement business model') == 'related_secondary'
    assert m.candidate_relation(policy, url, 'Transport and Storage business model') == 'related_secondary'
    au = {'policy_id': 'au-offshore-ghg-act', 'title': 'Offshore Petroleum and Greenhouse Gas Storage Act 2006',
          'url': 'https://www.legislation.gov.au/C2006A00014/latest/text'}
    assert m.candidate_relation(au, 'https://www.legislation.gov.au/C2006A00014/latest/text/part/2',
                                'Offshore Petroleum and Greenhouse Gas Storage Act 2006 Part 2') == 'same_instrument_internal_section'
    assert m.candidate_version_alignment(au, au['url'], 'Offshore Act 2006') == 'year_token_match_unverified'


if __name__ == '__main__':
    for name, fn in list(globals().items()):
        if name.startswith('test_') and callable(fn):
            fn()
            print('PASS', name)
