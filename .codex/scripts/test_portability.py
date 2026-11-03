"""The tracked Codex configuration of this checkout stays portable and policy-free."""
from pathlib import Path
import tomllib
import unittest

from agent_config import validate_declared_agents, validate_global_policy, validate_mcp_portability

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / '.codex/config.toml'


class TrackedConfigTests(unittest.TestCase):
    def setUp(self):
        self.config = tomllib.loads(CONFIG.read_text(encoding='utf-8'))

    def test_declares_portable_servers_including_nx(self):
        self.assertIn('nx-mcp', self.config['mcp_servers'])
        self.assertGreaterEqual(validate_mcp_portability(self.config), 1)

    def test_sets_no_session_policy(self):
        validate_global_policy(self.config)

    def test_declares_only_existing_non_pf_roles(self):
        self.assertEqual(validate_declared_agents(self.config, CONFIG), 1)
        self.assertTrue((ROOT / '.codex/agents/ci-monitor-subagent.toml').is_file())


if __name__ == '__main__':
    unittest.main()
