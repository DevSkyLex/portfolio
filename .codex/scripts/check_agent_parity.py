"""Check that the Claude and Codex agent catalogues of this checkout stay independent and in parity.

Each client keeps its own definitions: `.claude/agents/<name>.md` (frontmatter) and
`.codex/agents/<name>.toml` (native role). Neither is derived from the other; this script reads both,
compares the role names, validates each side's policy and prints a report. Nothing is executed and no
agent is started. Nx-managed roles without the pf- prefix (ci-monitor-subagent) are outside the catalogue.
"""
from pathlib import Path
import json
import re
import sys
import tomllib

from agent_config import is_portfolio_agent, is_read_only, validate_native_agent

CLAUDE_EFFORTS = {'sonnet': {'medium', 'high'}, 'opus': {'high', 'xhigh'}}
WRITE_TOOLS = {'Edit', 'Write', 'MultiEdit', 'NotebookEdit'}
DELEGATION_TOOLS = {'Agent', 'Task'}
OWN_NAME = re.compile(r'pf-[a-z0-9]+(?:-[a-z0-9]+)*')


def claude_fields(text: str) -> dict[str, str]:
    """Read the scalar frontmatter of an authored agent, rejecting duplicate fields."""
    match = re.match(r'^---\r?\n(.*?)\r?\n---(?:\r?\n|$)', text, re.S)
    if not match:
        raise ValueError('Missing agent frontmatter')
    fields = {}
    for line in match[1].splitlines():
        field = re.match(r'^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$', line)
        if field:
            key, value = field.groups()
            if key in fields:
                raise ValueError(f'Duplicate frontmatter field: {key}')
            fields[key] = value.strip().strip('"\'')
    return fields


def validate_claude(fields: dict, text: str, root: Path) -> None:
    """Validate native fields, own resources and the read-only tool boundary."""
    for key in ['name', 'description', 'tools', 'model', 'effort']:
        if not fields.get(key):
            raise ValueError(f'Missing Claude {key}')
    if not OWN_NAME.fullmatch(fields['name']):
        raise ValueError(f'Invalid Claude name: {fields["name"]}')
    if fields['model'] not in CLAUDE_EFFORTS or fields['effort'] not in CLAUDE_EFFORTS[fields['model']]:
        raise ValueError(f'Invalid Claude model/effort: {fields["name"]}')
    if {'fastMode', 'fast_mode', 'service_tier', 'model_reasoning_effort'} & fields.keys():
        raise ValueError('Fast/session fields do not belong in Claude agent frontmatter')
    if {'permissionMode', 'mcpServers', 'hooks', 'isolation'} & fields.keys():
        raise ValueError('Claude roles must inherit permission and execution policy')
    tools = {tool.strip() for tool in fields['tools'].split(',') if tool.strip()}
    if is_read_only(fields['name']) and tools & (WRITE_TOOLS | DELEGATION_TOOLS):
        raise ValueError(f'Read-only Claude role has writing/delegation tools: {fields["name"]}')
    if tools & DELEGATION_TOOLS:
        raise ValueError(f'Claude role must not delegate: {fields["name"]}')
    if '.codex/agents' in text or re.search(r'(?m)^\s*(?:cd[^\n]*&&\s*)?codex\s+exec\b', text):
        raise ValueError(f'Claude role imports Codex agents or starts a nested challenge: {fields["name"]}')
    for relative in re.findall(r'\.claude/(?:skills|rules)/(?:[\w.-]+/)*[\w.-]+\.md', text):
        if not (root / relative).is_file():
            raise ValueError(f'Missing Claude resource: {relative}')


def catalogs(root: Path) -> tuple[dict, dict]:
    """Read each client's own definitions and require the same pf- names on both sides."""
    native, claude = {}, {}
    for path in sorted((root / '.codex/agents').glob('*.toml')):
        data = tomllib.loads(path.read_text(encoding='utf-8'))
        if not is_portfolio_agent(data.get('name')) and not path.stem.startswith('pf-'):
            continue  # Nx-managed role, declared in config.toml.
        validate_native_agent(data, path.name)
        if data['name'] != path.stem or data['name'] in native:
            raise ValueError(f'Duplicate/mismatched native filename: {path.name}')
        native[data['name']] = data
    for path in sorted((root / '.claude/agents').glob('*.md')):
        text = path.read_text(encoding='utf-8')
        fields = claude_fields(text)
        validate_claude(fields, text, root)
        if fields['name'] != path.stem or fields['name'] in claude:
            raise ValueError(f'Duplicate/mismatched Claude filename: {path.name}')
        claude[fields['name']] = fields
    if native.keys() != claude.keys():
        raise ValueError('Agent parity mismatch: missing Claude '
                         + (', '.join(sorted(native.keys() - claude.keys())) or 'none')
                         + '; missing Codex ' + (', '.join(sorted(claude.keys() - native.keys())) or 'none'))
    settings = json.loads((root / '.claude/settings.json').read_text(encoding='utf-8'))
    if settings.get('fastMode') is not False or settings.get('env', {}).get('CLAUDE_CODE_DISABLE_FAST_MODE') != '1':
        raise ValueError('Claude Fast must be disabled in project settings and environment')
    return native, claude


def check(root: Path) -> dict:
    native, _ = catalogs(root)
    return {
        'agents': len(native),
        'read_only': sum(is_read_only(name) for name in native),
        'luna_fast': sum(agent['model'] == 'gpt-6-luna' for agent in native.values()),
        'status': 'PASS',
        'runtime_verified': False,
    }


if __name__ == '__main__':
    try:
        print(json.dumps(check(Path(__file__).resolve().parents[2]), indent=2))
    except (OSError, ValueError, KeyError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1)
