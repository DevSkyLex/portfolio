from pathlib import Path
import tempfile
import unittest

from check_links import check_links, link_targets


class MarkdownLinkTests(unittest.TestCase):
    def test_examples_comments_and_remote_links_are_not_local_checks(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '.codex').mkdir()
            (root / '.codex/README.md').write_text(
                '```md\n[example](missing.md)\n```\n'
                '`[example](missing.md)`\n<!-- [example](missing.md) -->\n'
                '<!--\n[example](missing.md)\n-->\n'
                '[web](https://example.com/missing.md)\n[anchor](#section)\n', encoding='utf-8')
            self.assertEqual(check_links(root)['local_links'], 0)

    def test_relative_encoded_reference_and_angle_bracket_links(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '.codex').mkdir()
            (root / 'With spaces.md').write_text('# Target', encoding='utf-8')
            (root / '.codex/README.md').write_text(
                '[one](../With%20spaces.md#target)\n[two](<../With spaces.md>)\n'
                '[three]: ../With%20spaces.md "Target"\n', encoding='utf-8')
            self.assertEqual(check_links(root)['local_links'], 3)

    def test_broken_link_reports_source_and_line(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'CLAUDE.md').write_text('# Entry\n[bad](missing.md)\n', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, r'CLAUDE.md:2: missing.md'):
                check_links(root)

    def test_claude_docs_are_included_and_worktrees_and_agents_skills_excluded(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '.claude/rules').mkdir(parents=True)
            (root / '.claude/rules/x.md').write_text('[missing](lost.md)', encoding='utf-8')
            (root / '.claude/worktrees/w').mkdir(parents=True)
            (root / '.claude/worktrees/w/y.md').write_text('[missing](lost.md)', encoding='utf-8')
            (root / '.agents/skills/nx-workspace').mkdir(parents=True)
            (root / '.agents/skills/nx-workspace/SKILL.md').write_text('[vendor](nowhere.md)', encoding='utf-8')
            with self.assertRaisesRegex(ValueError, r'\.claude/rules/x.md:1: lost.md'):
                check_links(root)
            (root / '.claude/rules/lost.md').write_text('Present', encoding='utf-8')
            self.assertEqual(check_links(root)['documents'], 2)

    def test_tilde_fences_and_link_titles(self):
        self.assertEqual(list(link_targets('~~~md\n[x](missing.md)\n~~~\n[x](ok.md "Title")')), [(4, 'ok.md')])


if __name__ == '__main__':
    unittest.main()
