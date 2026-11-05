"""Exercise the public Brevo transport template with synthetic credentials."""

import unittest
from pathlib import Path
from urllib.parse import unquote, urlsplit

import yaml
from jinja2 import Environment, StrictUndefined


class BrevoSmtpConfigurationTest(unittest.TestCase):
    def test_smtps_url_preserves_credentials_without_changing_the_host(self):
        path = Path(__file__).resolve().parents[1] / 'roles/portfolio/vars/main.yml'
        variables = yaml.safe_load(path.read_text(encoding='utf-8'))
        template = Environment(undefined=StrictUndefined).from_string(
            variables['portfolio_contact_smtp_url']
        )
        login = 'fixture+test@example.invalid'
        credential = 'fixture:/?@+#%'
        url = urlsplit(
            template.render(portfolio_brevo_smtp_login=login, portfolio_brevo_smtp_key=credential)
        )

        self.assertEqual(url.scheme, 'smtps')
        self.assertEqual(url.hostname, 'smtp-relay.brevo.com')
        self.assertEqual(url.port, 465)
        self.assertEqual(unquote(url.username), login)
        self.assertEqual(unquote(url.password), credential)
        self.assertEqual(url.path, '')
        self.assertEqual(url.query, '')
        self.assertEqual(url.fragment, '')


if __name__ == '__main__':
    unittest.main()
