"""Validate the portfolio agent tooling (Python 3.11+, standard library only).

Checks the agent catalogues and their parity, the Codex configuration, the Claude skills and commands,
the hook manifests and the byte-identical shared files, local Markdown links, the repository paths named
by the instructions, and the independence of the client-scoped Codex files. Nothing is written or run.
"""
from pathlib import Path
import hashlib
import json
import re
import tomllib
from urllib.parse import unquote

from agent_config import (
    validate_declared_agents, validate_global_policy, validate_mcp_portability, validate_native_references,
)
from check_agent_parity import catalogs
from check_links import check_links, link_targets

# Files shared by both clients: Claude copy -> Codex copy, byte-identical once line endings are normalized.
SHARED_FILES = {
    '.claude/hooks/guard.mjs': '.codex/hooks/guard.mjs',
    '.claude/hooks/guard-git.mjs': '.codex/hooks/guard-git.mjs',
    '.claude/hooks/guard-delete.mjs': '.codex/hooks/guard-delete.mjs',
    '.claude/hooks/format.mjs': '.codex/hooks/format.mjs',
    '.claude/skills/design-fidelity/style-diff.mjs': '.codex/scripts/style-diff.mjs',
}
CLAUDE_HOOKS = ('guard.mjs', 'guard-git.mjs', 'guard-delete.mjs', 'format.mjs')
# Codex files that instruct Codex at run time must not point at the Claude folder. The validator scripts,
# README.md and maintenance.md describe cross-client maintenance and are exempt.
CLIENT_SCOPED = ('agents', 'rules', 'references', 'hooks', 'workflow.md', 'rules.md', 'hooks.json',
                 'config.toml', 'third-party-skills.md')
# Roots whose paths, written in backticks in an instruction file, must exist.
PATH_ROOTS = ('apps/', 'libs/', 'tools/', 'docs/', 'docker/', 'ansible/', '.github/', '.githooks/',
              '.claude/', '.codex/')
PLACEHOLDER = re.compile(r'[<>*{}…|$]')


def normalized_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes().replace(b'\r\n', b'\n')).hexdigest()


def validate_shared_files(root: Path) -> int:
    for claude, codex in SHARED_FILES.items():
        left, right = root / claude, root / codex
        if not left.is_file() or not right.is_file():
            raise ValueError(f'Missing shared copy: {claude} / {codex}')
        if normalized_hash(left) != normalized_hash(right):
            raise ValueError(f'Shared copies differ: {claude} and {codex}')
    return len(SHARED_FILES)


def find_cross_client_references(root: Path) -> list[str]:
    forbidden = re.compile(rb'[.]claude\b', re.I)
    candidates = []
    for entry in CLIENT_SCOPED:
        target = root / '.codex' / entry
        if target.is_file():
            candidates.append(target)
        elif target.is_dir():
            candidates.extend(path for path in target.rglob('*') if path.is_file())
    return sorted(
        path.relative_to(root).as_posix() for path in candidates
        if '__pycache__' not in path.parts and forbidden.search(path.read_bytes())
    )


def instruction_files(root: Path) -> list[Path]:
    files = []
    for pattern in ('agents/*.md', 'commands/*.md', 'rules/*.md', 'skills/*/SKILL.md', 'README.md'):
        files.extend((root / '.claude').glob(pattern))
    files.extend((root / '.codex').rglob('*.md'))
    files.extend((root / '.agents/skills').glob('pf-*/**/*.md'))
    files.extend(path for path in (root / 'AGENTS.md', root / 'CLAUDE.md') if path.is_file())
    return sorted(set(files))


def repository_paths(text: str):
    """Repository paths written inside backticks, placeholders excepted."""
    for span in re.findall(r'`([^`\n]+)`', text):
        for word in span.split():
            word = word.strip('\'"(),;:')
            if word.startswith(PATH_ROOTS) and not PLACEHOLDER.search(word):
                yield word.rstrip('.')


def validate_repository_paths(root: Path) -> int:
    missing = []
    count = 0
    for document in instruction_files(root):
        for relative in repository_paths(document.read_text(encoding='utf-8')):
            count += 1
            if not (root / relative).exists():
                missing.append(f'{document.relative_to(root).as_posix()}: {relative}')
    if missing:
        raise ValueError('Instruction files name missing repository paths:\n' + '\n'.join(sorted(set(missing))))
    return count


def validate_claude_skills(root: Path) -> int:
    skills = sorted(path for path in (root / '.claude/skills').iterdir() if path.is_dir())
    for skill in skills:
        if not (skill / 'SKILL.md').is_file():
            raise ValueError(f'Missing SKILL.md: {skill.name}')
        text = (skill / 'SKILL.md').read_text(encoding='utf-8')
        frontmatter = re.match(r'^---\r?\n(.*?)\r?\n---', text, re.S)
        if not frontmatter:
            raise ValueError(f'Missing skill frontmatter: {skill.name}')
        if not re.search(rf'^name:\s*["\']?{re.escape(skill.name)}["\']?\s*$', frontmatter[1], re.M):
            raise ValueError(f'Invalid Claude skill name: {skill.name}')
        if not re.search(r'^description:\s*\S', frontmatter[1], re.M):
            raise ValueError(f'Missing skill description: {skill.name}')
    return len(skills)


def shared_skill_metadata(path: Path) -> tuple[str, str]:
    """Read the name and description of an authored skill without requiring a YAML dependency."""
    source = path.read_text(encoding='utf-8')
    frontmatter = re.match(r'^---\r?\n(.*?)\r?\n---', source, re.S)
    if not frontmatter:
        raise ValueError(f'Missing shared skill frontmatter: {path.name}')
    values = []
    for key in ('name', 'description'):
        match = re.search(rf'^{key}:[ \t]*(.*)$', frontmatter[1], re.M)
        if not match or not match[1].strip():
            raise ValueError(f'Missing shared skill {key}: {path.parent.name}')
        value = match[1].strip()
        if value in ('>', '>-', '>+', '|', '|-', '|+'):
            following = frontmatter[1][match.end():]
            lines = []
            for line in following.splitlines():
                if line and not line[0].isspace():
                    break
                lines.append(line.strip())
            value = ' '.join(lines)
        value = value.strip('\'"')
        if not value:
            raise ValueError(f'Missing shared skill {key}: {path.parent.name}')
        values.append(' '.join(value.split()))
    return values[0], values[1]


def validate_shared_skills(root: Path) -> int:
    """Keep authored shared skills discoverable in both clients and independent of their configs."""
    shared_root = root / '.agents/skills'
    claude_root = root / '.claude/skills'
    skills = sorted(path for path in shared_root.glob('pf-*') if path.is_dir())
    for wrapper in sorted(path for path in claude_root.glob('pf-*') if path.is_dir()):
        if not (shared_root / wrapper.name / 'SKILL.md').is_file():
            raise ValueError(f'Missing canonical shared skill: {wrapper.name}')
    for skill in skills:
        if not re.fullmatch(r'pf-[a-z0-9]+(?:-[a-z0-9]+)*', skill.name):
            raise ValueError(f'Invalid shared skill folder: {skill.name}')
        canonical = skill / 'SKILL.md'
        wrapper = claude_root / skill.name / 'SKILL.md'
        if not canonical.is_file():
            raise ValueError(f'Missing canonical shared skill: {skill.name}')
        if not canonical.resolve().is_relative_to(shared_root.resolve()):
            raise ValueError(f'Shared skill escapes its owned directory: {skill.name}')
        metadata = shared_skill_metadata(canonical)
        if metadata[0] != skill.name:
            raise ValueError(f'Shared skill name does not match its folder: {skill.name}')
        if not wrapper.is_file():
            raise ValueError(f'Missing shared skill discovery wrapper: {skill.name}')
        if shared_skill_metadata(wrapper) != metadata:
            raise ValueError(f'Shared skill discovery metadata differs: {skill.name}')
        if not any((wrapper.parent / unquote(target.split('#', 1)[0].split('?', 1)[0])).resolve() == canonical.resolve()
                   for _, target in link_targets(wrapper.read_text(encoding='utf-8'))
                   if not re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target)
                   and not target.startswith(('#', '//'))):
            raise ValueError(f'Discovery wrapper does not link its canonical shared skill: {skill.name}')
        for document in skill.rglob('*.md'):
            text = document.read_text(encoding='utf-8')
            if re.search(r'[.]claude\b|[.]codex\b', text, re.I):
                raise ValueError(f'Shared skill depends on a client folder: {skill.name}')
            for _, target in link_targets(text):
                if target.startswith(('#', '//')) or re.match(r'^[a-zA-Z][a-zA-Z0-9+.-]*:', target):
                    continue
                local = unquote(target.split('#', 1)[0].split('?', 1)[0])
                destination = (document.parent / local).resolve()
                if not destination.is_relative_to(root.resolve()) or not destination.exists():
                    raise ValueError(f'Broken shared skill reference in {skill.name}: {target}')
    return len(skills)


def validate_commands(root: Path, agents: set) -> int:
    commands = sorted((root / '.claude/commands').glob('*.md'))
    for command in commands:
        text = command.read_text(encoding='utf-8')
        if not re.match(r'^---\r?\n(?:.*\r?\n)*?description:\s*\S', text):
            raise ValueError(f'Missing command description: {command.name}')
        for agent in re.findall(r'\*\*(pf-[a-z0-9-]+)\*\* subagent', text):
            if agent not in agents:
                raise ValueError(f'{command.name} delegates to an unknown agent: {agent}')
    return len(commands)


def validate_hook_manifests(root: Path) -> None:
    codex = json.loads((root / '.codex/hooks.json').read_text(encoding='utf-8'))['hooks']
    if not {'PreToolUse', 'PostToolUse'} <= codex.keys():
        raise ValueError('.codex/hooks.json needs PreToolUse and PostToolUse')
    for groups in codex.values():
        for group in groups:
            re.compile(group['matcher'])
            if not group['hooks'] or any(hook['type'] != 'command' for hook in group['hooks']):
                raise ValueError('.codex/hooks.json hooks must be commands')
    for manifest, variable, prefix in (
        (root / '.claude/settings.json', '${CLAUDE_PROJECT_DIR}', '.claude/hooks/'),
        (root / '.claude/hooks/hooks.json', '${CLAUDE_PLUGIN_ROOT}', '.claude/hooks/'),
    ):
        hooks = json.loads(manifest.read_text(encoding='utf-8'))['hooks']
        commands = [hook['command'] for groups in hooks.values() for group in groups for hook in group['hooks']]
        wired = {re.search(r'/hooks/([\w-]+\.mjs)', command)[1] for command in commands}
        if wired != set(CLAUDE_HOOKS):
            raise ValueError(f'{manifest.relative_to(root).as_posix()} wires {sorted(wired)}, expected {sorted(CLAUDE_HOOKS)}')
        for command in commands:
            if variable not in command:
                raise ValueError(f'{manifest.relative_to(root).as_posix()}: hooks resolve through {variable}')
    for hook in CLAUDE_HOOKS:
        if not (root / '.claude/hooks' / hook).is_file():
            raise ValueError(f'Missing Claude hook: {hook}')


def validate(root: Path) -> dict:
    config_path = root / '.codex/config.toml'
    config = tomllib.loads(config_path.read_text(encoding='utf-8'))
    validate_global_policy(config)
    servers = validate_mcp_portability(config)
    declared = validate_declared_agents(config, config_path)
    native, claude = catalogs(root)
    for agent in native.values():
        validate_native_references(agent['developer_instructions'], root)
    skills = validate_claude_skills(root) if (root / '.claude/skills').is_dir() else 0
    project_skills = validate_shared_skills(root)
    commands = validate_commands(root, set(claude)) if (root / '.claude/commands').is_dir() else 0
    validate_hook_manifests(root)
    shared = validate_shared_files(root)
    links = check_links(root)
    paths = validate_repository_paths(root)
    cross = find_cross_client_references(root)
    if cross:
        raise ValueError(f'Client-scoped Codex files name the other client folder: {cross}')
    return {
        'agents': len(native), 'read_only_agents': sum(name.endswith(('-reviewer', '-auditor')) for name in native),
        'declared_agents': declared, 'mcp_servers': servers, 'claude_skills': skills, 'claude_commands': commands,
        'project_skills': project_skills,
        'shared_files': shared, 'documents': links['documents'], 'local_links': links['local_links'],
        'repository_paths': paths, 'status': 'PASS',
    }


if __name__ == '__main__':
    import sys
    try:
        print(json.dumps(validate(Path(__file__).resolve().parents[2]), indent=2))
    except (OSError, ValueError, KeyError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
