"""Native role settings, global policy, MCP portability, declared agents and native references."""
from pathlib import Path
import tempfile
import unittest

from agent_config import (
    GLOBAL_POLICY_KEYS, MODEL_EFFORTS, validate_declared_agents, validate_global_policy,
    validate_mcp_portability, validate_native_agent, validate_native_references,
)


def agent(name='pf-web-example-builder', model='gpt-6.1-sol', effort='high'):
    fast = model == 'gpt-6-luna'
    result = {'name': name, 'description': 'Example', 'developer_instructions': 'Bounded task.',
              'model': model, 'model_reasoning_effort': effort,
              'service_tier': 'fast' if fast else 'default', 'features': {'fast_mode': fast}}
    if name.endswith(('-reviewer', '-auditor', '-explorer')):
        result['sandbox_mode'] = 'read-only'
    return result


class NativePolicyTests(unittest.TestCase):
    def test_accepts_every_supported_model_effort_pair(self):
        for model, efforts in MODEL_EFFORTS.items():
            for effort in efforts:
                with self.subTest(model=model, effort=effort):
                    validate_native_agent(agent(model=model, effort=effort), 'role.toml')

    def test_rejects_missing_unknown_and_inherited_model_or_effort(self):
        for key, values in {'model': [None, 'inherit', 'gpt-6-terra', True],
                            'model_reasoning_effort': [None, 'inherit', 'low', True]}.items():
            for value in values:
                data = agent()
                data[key] = value
                with self.subTest(key=key, value=value), self.assertRaisesRegex(ValueError, key):
                    validate_native_agent(data, 'role.toml')

    def test_fast_is_explicit_and_luna_only(self):
        for model in MODEL_EFFORTS:
            data = agent(model=model, effort=sorted(MODEL_EFFORTS[model])[0])
            data['service_tier'] = 'default' if model == 'gpt-6-luna' else 'fast'
            with self.subTest(model=model), self.assertRaisesRegex(ValueError, 'service_tier'):
                validate_native_agent(data, 'role.toml')
            for feature in [None, {}, {'fast_mode': 'false'}, {'fast_mode': model != 'gpt-6-luna'},
                            {'fast_mode': model == 'gpt-6-luna', 'extra': True}]:
                data = agent(model=model, effort=sorted(MODEL_EFFORTS[model])[0])
                data['features'] = feature
                with self.subTest(model=model, feature=feature), self.assertRaisesRegex(ValueError, 'fast_mode'):
                    validate_native_agent(data, 'role.toml')

    def test_sandbox_follows_the_role_kind(self):
        for suffix in ['reviewer', 'auditor', 'explorer']:
            data = agent('pf-example-' + suffix)
            validate_native_agent(data, 'role.toml')
            for mode in [None, 'workspace-write', 'danger-full-access']:
                data['sandbox_mode'] = mode
                with self.subTest(mode=mode), self.assertRaisesRegex(ValueError, 'Read-only'):
                    validate_native_agent(data, 'role.toml')
        data = agent()
        data['sandbox_mode'] = 'read-only'
        with self.assertRaisesRegex(ValueError, 'inherit'):
            validate_native_agent(data, 'role.toml')

    def test_rejects_extra_policy_foreign_names_and_empty_text(self):
        for key in ['approval_policy', 'mcp_servers', 'permissions']:
            data = agent()
            data[key] = 'override'
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, key):
                validate_native_agent(data, 'role.toml')
        for name in ['ds-web-example-builder', 'pf-Web-Example']:
            with self.subTest(name=name), self.assertRaises(ValueError):
                validate_native_agent(agent(name), 'role.toml')
        data = agent()
        data['developer_instructions'] = '  '
        with self.assertRaisesRegex(ValueError, 'developer_instructions'):
            validate_native_agent(data, 'role.toml')


class ProjectConfigTests(unittest.TestCase):
    def test_global_policy_stays_personal(self):
        for key in GLOBAL_POLICY_KEYS:
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, key):
                validate_global_policy({key: 'override'})
        with self.assertRaisesRegex(ValueError, 'fast_mode'):
            validate_global_policy({'features': {'fast_mode': True}})
        with self.assertRaisesRegex(ValueError, 'default_subagent_model'):
            validate_global_policy({'agents': {'default_subagent_model': 'x'}})
        validate_global_policy({'features': {'multi_agent': True}, 'agents': {'max_threads': 4}})

    def test_mcp_entries_are_portable(self):
        self.assertEqual(validate_mcp_portability({'mcp_servers': {
            'nx-mcp': {'command': 'npx', 'args': ['nx', 'mcp', '--minimal']}}}), 1)
        for absolute in ['D:/workspace/site', r'D:\workspace\site', '/home/dev/site', r'\\host\share\site']:
            for field in ['cwd', 'args', 'env']:
                server = {'command': 'npx', 'args': ['-y', 'example']}
                server[field] = {'cwd': absolute, 'args': ['--root', absolute], 'env': {'ROOT': absolute}}[field]
                with self.subTest(path=absolute, field=field), self.assertRaises(ValueError):
                    validate_mcp_portability({'mcp_servers': {'example': server}})
        with self.assertRaisesRegex(ValueError, 'PATH'):
            validate_mcp_portability({'mcp_servers': {'x': {'command': 'C:/tools/npx.cmd'}}})

    def test_declared_agents_exist_and_pf_roles_are_not_declared(self):
        with tempfile.TemporaryDirectory() as folder:
            config_path = Path(folder) / '.codex/config.toml'
            (config_path.parent / 'agents').mkdir(parents=True)
            (config_path.parent / 'agents/ci-monitor-subagent.toml').write_text('x = 1\n', encoding='utf-8')
            ok = {'agents': {'ci-monitor-subagent': {'description': 'd', 'config_file': 'agents/ci-monitor-subagent.toml'}}}
            self.assertEqual(validate_declared_agents(ok, config_path), 1)
            for config in [
                {'agents': {'x': {'config_file': 'agents/missing.toml'}}},
                {'agents': {'x': {'config_file': '../outside.toml'}}},
                {'agents': {'x': {'config_file': 'C:/abs/x.toml'}}},
                {'agents': {'pf-web-example-builder': {'config_file': 'agents/ci-monitor-subagent.toml'}}},
            ]:
                with self.subTest(config=config), self.assertRaises(ValueError):
                    validate_declared_agents(config, config_path)

    def test_native_references_must_exist_inside_the_checkout(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            reference = root / '.codex/references/details.md'
            reference.parent.mkdir(parents=True)
            reference.write_text('Reference', encoding='utf-8')
            validate_native_references('Read .codex/references/details.md.', root)
            for text in ['Read .codex/references/missing.md.', 'Read docs/architecture/missing.md.',
                         'Follow libs/frontend/ui/README.md.']:
                with self.subTest(text=text), self.assertRaisesRegex(ValueError, 'agent reference'):
                    validate_native_references(text, root)


if __name__ == '__main__':
    unittest.main()
