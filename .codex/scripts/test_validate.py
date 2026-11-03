"""Validator integration: shared copies, hook manifests, skills, commands, repository paths, client scope."""
from pathlib import Path
import json
import tempfile
import unittest

from validate import (
    SHARED_FILES, find_cross_client_references, repository_paths, validate, validate_repository_paths,
)

def hooks(var, base):
    command = lambda name: {'type': 'command', 'command': f'node "{var}/{base}{name}"'}
    return {'hooks': {
        'PreToolUse': [{'matcher': 'Write|Edit|MultiEdit', 'hooks': [command('guard.mjs')]},
                       {'matcher': 'Bash|PowerShell', 'hooks': [command('guard-git.mjs'), command('guard-delete.mjs')]}],
        'PostToolUse': [{'matcher': 'Write|Edit|MultiEdit', 'hooks': [command('format.mjs')]}],
    }}


class ValidatorIntegrationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        for folder in ['.codex/agents', '.codex/hooks', '.codex/scripts', '.claude/agents', '.claude/hooks',
                       '.claude/skills/example', '.claude/commands', '.claude/skills/design-fidelity', 'docs']:
            (self.root / folder).mkdir(parents=True)
        self.write('.codex/config.toml', '[mcp_servers.nx-mcp]\ncommand = "npx"\nargs = ["nx", "mcp"]\n')
        self.write('.codex/hooks.json', json.dumps({'hooks': {'PreToolUse': [], 'PostToolUse': []}}))
        settings = {'fastMode': False, 'env': {'CLAUDE_CODE_DISABLE_FAST_MODE': '1'},
                    **hooks('${CLAUDE_PROJECT_DIR}', '.claude/hooks/')}
        self.write('.claude/settings.json', json.dumps(settings))
        self.write('.claude/hooks/hooks.json', json.dumps(hooks('${CLAUDE_PLUGIN_ROOT}', 'hooks/')))
        for claude, codex in SHARED_FILES.items():
            self.write(claude, '// shared\n')
            self.write(codex, '// shared\r\n')
        self.write('.claude/skills/example/SKILL.md', '---\nname: example\ndescription: Example.\n---\n')
        self.write('.claude/skills/design-fidelity/SKILL.md', '---\nname: design-fidelity\ndescription: Diff.\n---\n')
        self.write('docs/real.md', '# Real\n')
        self.add_role('pf-example-builder')

    def write(self, relative, content):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content.encode('utf-8'))

    def add_role(self, name):
        self.write(f'.codex/agents/{name}.toml',
                   f'name = "{name}"\nmodel = "gpt-6.1-sol"\nmodel_reasoning_effort = "high"\n'
                   'service_tier = "default"\ndescription = "Example"\n'
                   'developer_instructions = "Read docs/real.md."\n\n[features]\nfast_mode = false\n')
        self.write(f'.claude/agents/{name}.md',
                   f'---\nname: {name}\ndescription: Example.\ntools: Read, Edit\nmodel: sonnet\neffort: high\n---\n'
                   'Read `docs/real.md`.\n')

    def test_minimal_tree_passes_with_dynamic_counts(self):
        self.assertEqual(validate(self.root)['agents'], 1)
        self.add_role('pf-other-builder')
        self.assertEqual(validate(self.root)['agents'], 2)

    def add_shared_skill(self, name='pf-example', description='Owned technology guidance.'):
        text = f'---\nname: {name}\ndescription: {description}\n---\n'
        self.write(f'.agents/skills/{name}/SKILL.md', text + '\nRead [owner docs](../../../docs/real.md).\n')
        self.write(f'.claude/skills/{name}/SKILL.md', text +
                   f'\nRead [shared skill](../../../.agents/skills/{name}/SKILL.md).\n')

    def test_shared_skills_have_discoverable_canonical_metadata(self):
        self.add_shared_skill()
        self.assertEqual(validate(self.root)['project_skills'], 1)
        self.assertEqual(validate(self.root)['claude_skills'], 3)
        self.write('.agents/skills/angular-developer/references/upstream.md', 'External layout.\n')
        self.assertEqual(validate(self.root)['project_skills'], 1)

    def test_shared_skill_wrapper_cannot_outlive_its_canonical_source(self):
        self.add_shared_skill()
        (self.root / '.agents/skills/pf-example/SKILL.md').unlink()
        with self.assertRaisesRegex(ValueError, 'Missing canonical shared skill'):
            validate(self.root)

    def test_shared_skill_name_must_match_the_owned_folder(self):
        self.add_shared_skill()
        self.write('.agents/skills/pf-example/SKILL.md',
                   '---\nname: pf-other\ndescription: Owned technology guidance.\n---\n')
        with self.assertRaisesRegex(ValueError, 'name does not match'):
            validate(self.root)

    def test_shared_skill_discovery_description_cannot_drift(self):
        self.add_shared_skill()
        wrapper = self.root / '.claude/skills/pf-example/SKILL.md'
        wrapper.write_text(wrapper.read_text().replace('Owned technology guidance.', 'Another trigger.'), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'metadata differs'):
            validate(self.root)

    def test_shared_skill_wrapper_must_link_the_correct_source(self):
        self.add_shared_skill()
        wrapper = self.root / '.claude/skills/pf-example/SKILL.md'
        wrapper.write_text(wrapper.read_text().replace('../../../.agents/skills/pf-example/SKILL.md', '../../../docs/real.md'), encoding='utf-8')
        with self.assertRaisesRegex(ValueError, 'does not link its canonical'):
            validate(self.root)

    def test_shared_skills_cannot_depend_on_either_client(self):
        for client in ('.claude', '.codex'):
            self.add_shared_skill()
            path = self.root / '.agents/skills/pf-example/SKILL.md'
            path.write_text(path.read_text() + f'Read {client}/rules/example.md.\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'depends on a client'):
                validate(self.root)

    def test_shared_skill_local_references_must_exist_inside_the_checkout(self):
        self.add_shared_skill()
        path = self.root / '.agents/skills/pf-example/SKILL.md'
        for target in ('../../../docs/missing.md', '../../../../outside.md'):
            path.write_text('---\nname: pf-example\ndescription: Owned technology guidance.\n---\n'
                            f'[Required owner contract]({target})\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, 'Broken shared skill reference'):
                validate(self.root)

    def test_diverging_shared_copies_are_rejected(self):
        self.write('.codex/hooks/guard.mjs', '// another\n')
        with self.assertRaisesRegex(ValueError, 'Shared copies differ'):
            validate(self.root)

    def test_hook_manifests_must_wire_every_hook_through_the_variable(self):
        self.write('.claude/hooks/hooks.json', json.dumps(hooks('${CLAUDE_PROJECT_DIR}', '.claude/hooks/')))
        with self.assertRaisesRegex(ValueError, 'CLAUDE_PLUGIN_ROOT'):
            validate(self.root)
        broken = hooks('${CLAUDE_PROJECT_DIR}', '.claude/hooks/')
        broken['hooks']['PostToolUse'] = []
        self.write('.claude/settings.json', json.dumps({'fastMode': False, 'env': {'CLAUDE_CODE_DISABLE_FAST_MODE': '1'}, **broken}))
        self.write('.claude/hooks/hooks.json', json.dumps(hooks('${CLAUDE_PLUGIN_ROOT}', 'hooks/')))
        with self.assertRaisesRegex(ValueError, 'expected'):
            validate(self.root)

    def test_commands_must_delegate_to_existing_agents(self):
        self.write('.claude/commands/pf-x.md', '---\ndescription: X.\n---\n\nDelegate to the **pf-missing-builder** subagent: $ARGUMENTS\n')
        with self.assertRaisesRegex(ValueError, 'unknown agent'):
            validate(self.root)

    def test_skill_name_must_match_its_folder(self):
        self.write('.claude/skills/example/SKILL.md', '---\nname: other\ndescription: Example.\n---\n')
        with self.assertRaisesRegex(ValueError, 'skill name'):
            validate(self.root)

    def test_missing_repository_paths_are_reported(self):
        self.write('.claude/rules/x.md', 'See `docs/missing.md` and `libs/<ctx>/x.ts` and `npx nx test`.\n')
        with self.assertRaisesRegex(ValueError, 'docs/missing.md'):
            validate(self.root)
        self.write('.claude/rules/x.md', 'See `docs/real.md`, `libs/*/x.ts`, `apps/{a,b}`.\n')
        self.assertGreaterEqual(validate_repository_paths(self.root), 1)

    def test_client_scoped_codex_files_cannot_name_the_claude_folder(self):
        self.write('.codex/workflow.md', 'Read .claude/rules/state.md.\n')
        with self.assertRaisesRegex(ValueError, 'other client'):
            validate(self.root)

    def test_global_policy_in_config_is_rejected(self):
        self.write('.codex/config.toml', 'model = "gpt-6.1-sol"\n')
        with self.assertRaisesRegex(ValueError, 'model'):
            validate(self.root)


class HelperTests(unittest.TestCase):
    def test_repository_paths_skip_placeholders_and_strip_punctuation(self):
        text = '`npx nx build web` `apps/web/project.json`, `libs/<ctx>/x` `docs/a.md.` `(tools/x.mjs)`'
        self.assertEqual(list(repository_paths(text)), ['apps/web/project.json', 'docs/a.md', 'tools/x.mjs'])

    def test_human_docs_and_scripts_are_exempt_from_client_scope(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for relative in ['.codex/README.md', '.codex/maintenance.md', '.codex/scripts/validate.py']:
                (root / relative).parent.mkdir(parents=True, exist_ok=True)
                (root / relative).write_text('.claude/settings.json', encoding='utf-8')
            self.assertEqual(find_cross_client_references(root), [])
            (root / '.codex/rules').mkdir()
            (root / '.codex/rules/x.md').write_text('.claude/rules/x.md', encoding='utf-8')
            self.assertEqual(find_cross_client_references(root), ['.codex/rules/x.md'])


if __name__ == '__main__':
    unittest.main()
