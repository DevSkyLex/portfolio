"""Keep the SSR resource defaults independent from existing Nginx settings."""

import unittest
from pathlib import Path

import yaml
from jinja2 import Environment, StrictUndefined


class SsrResourceDefaultsTest(unittest.TestCase):
    def test_existing_nginx_limit_does_not_constrain_the_new_node_runtime(self):
        path = Path(__file__).resolve().parents[1] / 'roles/portfolio/defaults/main.yml'
        defaults = yaml.safe_load(path.read_text(encoding='utf-8'))
        settings = {'WEB_MEMORY_LIMIT': '128M', 'WEB_CPU_LIMIT': '0.5'}
        environment = Environment(undefined=StrictUndefined)
        environment.globals['lookup'] = lambda provider, name: settings.get(name, '')

        def render(name):
            return environment.from_string(defaults[name]).render()

        self.assertEqual(render('portfolio_web_memory_limit'), '128M')
        self.assertEqual(render('portfolio_web_cpu_limit'), '0.5')
        self.assertEqual(render('portfolio_ssr_memory_limit'), '512M')
        self.assertEqual(render('portfolio_ssr_cpu_limit'), '1.0')
        settings['SSR_MEMORY_LIMIT'] = '768M'
        self.assertEqual(render('portfolio_ssr_memory_limit'), '768M')


if __name__ == '__main__':
    unittest.main()
