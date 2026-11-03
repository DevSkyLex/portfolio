"""Claude frontmatter, read-only tools, client independence, parity and the project Fast settings."""
from pathlib import Path
import json
import tempfile
import unittest

from check_agent_parity import catalogs, check, claude_fields, validate_claude


def fields(name='pf-example-reviewer'):
    return {'name': name, 'description': 'Review', 'tools': 'Skill, Read, Grep, Glob, Bash',
            'model': 'sonnet', 'effort': 'high'}


class ClaudePolicyTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)

    def test_valid_native_fields(self):
        for model, effort in [('sonnet', 'medium'), ('sonnet', 'high'), ('opus', 'high'), ('opus', 'xhigh')]:
            data = fields()
            data.update(model=model, effort=effort)
            validate_claude(data, 'Assigned review.', self.root)

    def test_unknown_or_missing_model_and_effort_are_rejected(self):
        for key, value in [('model', 'inherit'), ('model', 'haiku'), ('effort', ''), ('effort', 'max')]:
            data = fields()
            data[key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                validate_claude(data, '', self.root)

    def test_foreign_or_malformed_names_are_rejected(self):
        for name in ['ds-web-example-reviewer', 'pf-Example', 'example-reviewer']:
            with self.subTest(name=name), self.assertRaisesRegex(ValueError, 'name'):
                validate_claude(fields(name), '', self.root)

    def test_read_only_roles_cannot_write_or_delegate(self):
        for tool in ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Agent', 'Task']:
            data = fields()
            data['tools'] += ', ' + tool
            with self.subTest(tool=tool), self.assertRaisesRegex(ValueError, 'Read-only'):
                validate_claude(data, '', self.root)
        data = fields('pf-example-builder')
        data['tools'] += ', Edit, Write'
        validate_claude(data, '', self.root)

    def test_writers_cannot_delegate(self):
        data = fields('pf-example-builder')
        data['tools'] += ', Agent'
        with self.assertRaisesRegex(ValueError, 'delegate'):
            validate_claude(data, '', self.root)

    def test_no_codex_agent_import_or_automatic_challenge(self):
        for text in ['Read .codex/agents/pf-example.toml.', 'codex exec -m gpt-6-luna']:
            with self.subTest(text=text), self.assertRaises(ValueError):
                validate_claude(fields(), text, self.root)

    def test_missing_resource_and_session_fields_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'Missing Claude resource'):
            validate_claude(fields(), 'Read .claude/skills/missing/SKILL.md.', self.root)
        for key in ['fastMode', 'service_tier', 'permissionMode', 'hooks']:
            data = fields()
            data[key] = 'true'
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_claude(data, '', self.root)

    def test_frontmatter_parsing(self):
        self.assertEqual(claude_fields("---\nname: x\ndescription: 'a: b'\n---\nBody")['description'], 'a: b')
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            claude_fields('---\nmodel: sonnet\nmodel: opus\n---\n')
        with self.assertRaisesRegex(ValueError, 'Missing'):
            claude_fields('No frontmatter')


class CatalogueTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        for folder in ['.codex/agents', '.claude/agents']:
            (self.root / folder).mkdir(parents=True)
        (self.root / '.codex/agents/pf-example-builder.toml').write_text(
            'name = "pf-example-builder"\nmodel = "gpt-6.1-sol"\nmodel_reasoning_effort = "high"\n'
            'service_tier = "default"\ndescription = "Example"\ndeveloper_instructions = "Bounded."\n'
            '\n[features]\nfast_mode = false\n', encoding='utf-8')
        (self.root / '.codex/agents/ci-monitor-subagent.toml').write_text(
            'developer_instructions = "Nx-managed."\n', encoding='utf-8')
        (self.root / '.claude/agents/pf-example-builder.md').write_text(
            '---\nname: pf-example-builder\ndescription: Example.\ntools: Read, Edit\nmodel: sonnet\n'
            'effort: high\n---\n', encoding='utf-8')
        self.settings({'fastMode': False, 'env': {'CLAUDE_CODE_DISABLE_FAST_MODE': '1'}})

    def settings(self, data):
        (self.root / '.claude/settings.json').write_text(json.dumps(data), encoding='utf-8')

    def test_parity_ignores_the_nx_managed_role(self):
        native, claude = catalogs(self.root)
        self.assertEqual(set(native), {'pf-example-builder'})
        self.assertEqual(native.keys(), claude.keys())
        self.assertEqual((check(self.root)['agents'], check(self.root)['status']), (1, 'PASS'))

    def test_one_sided_role_is_a_parity_mismatch(self):
        (self.root / '.claude/agents/pf-example-builder.md').unlink()
        with self.assertRaisesRegex(ValueError, 'parity'):
            catalogs(self.root)

    def test_mismatched_filename_is_rejected(self):
        (self.root / '.claude/agents/pf-example-builder.md').rename(self.root / '.claude/agents/pf-other-builder.md')
        with self.assertRaisesRegex(ValueError, 'mismatched'):
            catalogs(self.root)

    def test_fast_mode_must_stay_disabled(self):
        self.settings({'fastMode': True, 'env': {'CLAUDE_CODE_DISABLE_FAST_MODE': '1'}})
        with self.assertRaisesRegex(ValueError, 'Fast'):
            catalogs(self.root)


if __name__ == '__main__':
    unittest.main()
