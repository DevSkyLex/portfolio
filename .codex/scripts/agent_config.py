"""Validate the native portfolio agent settings and the agent declarations of .codex/config.toml.

Standard library only (Python 3.11+). Nothing is written or executed.
"""
from pathlib import Path, PurePosixPath, PureWindowsPath
import re

MODEL_EFFORTS = {
    'gpt-6-luna': frozenset({'medium', 'high'}),
    'gpt-6-sol': frozenset({'medium', 'high', 'xhigh'}),
    'gpt-6.1-sol': frozenset({'medium', 'high', 'xhigh'}),
    'gpt-6-astra': frozenset({'high', 'xhigh'}),
}
GLOBAL_POLICY_KEYS = frozenset({
    'model', 'model_reasoning_effort', 'approval_policy', 'sandbox_mode', 'projects', 'service_tier',
})
GLOBAL_AGENT_MODEL_KEYS = frozenset({'default_subagent_model', 'default_subagent_reasoning_effort'})
ROLE_PREFIX = 'pf-'
ROLE_NAME = re.compile(r'pf-[a-z0-9]+(?:-[a-z0-9]+)*')
READ_ONLY_SUFFIXES = ('-reviewer', '-auditor', '-explorer')
NATIVE_KEYS = frozenset({
    'name', 'description', 'developer_instructions', 'model', 'model_reasoning_effort',
    'service_tier', 'features', 'sandbox_mode',
})


def is_portfolio_agent(name) -> bool:
    """Authored roles carry the pf- prefix; Nx-managed roles (ci-monitor-subagent) do not."""
    return isinstance(name, str) and name.startswith(ROLE_PREFIX)


def is_read_only(name: str) -> bool:
    return name.endswith(READ_ONLY_SUFFIXES)


def validate_native_agent(agent: dict, source: str) -> None:
    """Require explicit model, effort and tier, and keep the parent's permission boundaries."""
    name = agent.get('name')
    if not is_portfolio_agent(name):
        raise ValueError(f'Native role outside the pf- catalogue in {source}: {name}')
    if not ROLE_NAME.fullmatch(name):
        raise ValueError(f'Invalid portfolio role name in {source}: {name}')
    extra = agent.keys() - NATIVE_KEYS
    if extra:
        raise ValueError(f'Unsupported native policy in {source}: {", ".join(sorted(extra))}')
    for key in ('description', 'developer_instructions'):
        if not isinstance(agent.get(key), str) or not agent[key].strip():
            raise ValueError(f'Missing {key} in {source}')
    model = agent.get('model')
    if not isinstance(model, str) or model not in MODEL_EFFORTS:
        raise ValueError(f'Missing or unsupported model in {source}')
    effort = agent.get('model_reasoning_effort')
    if not isinstance(effort, str) or effort not in MODEL_EFFORTS[model]:
        raise ValueError(f'Missing or unsupported model_reasoning_effort in {source}')
    fast = model == 'gpt-6-luna'
    if agent.get('service_tier') != ('fast' if fast else 'default'):
        raise ValueError(f'Invalid service_tier in {source}: Fast is required for Luna only')
    features = agent.get('features')
    if not isinstance(features, dict) or set(features) != {'fast_mode'} or features['fast_mode'] is not fast:
        raise ValueError(f'Invalid features.fast_mode in {source}: must be explicit and match the model')
    if is_read_only(name):
        if agent.get('sandbox_mode') != 'read-only':
            raise ValueError(f'Read-only role requires sandbox_mode = "read-only": {source}')
    elif 'sandbox_mode' in agent:
        raise ValueError(f'Writer role must inherit its sandbox: {source}')


def validate_global_policy(config: dict) -> None:
    """Keep role preferences out of the primary session and of personal policy."""
    extra = GLOBAL_POLICY_KEYS & config.keys()
    if extra:
        raise ValueError('Project config overrides user policy: ' + ', '.join(sorted(extra)))
    if 'fast_mode' in config.get('features', {}):
        raise ValueError('Project config overrides features.fast_mode: set it in each native role')
    agents = config.get('agents', {})
    if not isinstance(agents, dict):
        raise ValueError('Project agents configuration must be a table')
    defaults = GLOBAL_AGENT_MODEL_KEYS & agents.keys()
    if defaults:
        raise ValueError('Project config overrides agent defaults: ' + ', '.join(sorted(defaults)))


def validate_mcp_portability(config: dict) -> int:
    """Shared MCP entries resolve executables through PATH and carry no absolute machine path."""
    servers = config.get('mcp_servers', {})
    for name, server in servers.items():
        command = server.get('command', '')
        if not command or '/' in command or '\\' in command:
            raise ValueError(f'{name}: resolve executables through PATH')
        values = [server.get('cwd', '')] + list(server.get('args', [])) + list(server.get('env', {}).values())
        for value in values:
            if isinstance(value, str) and (PurePosixPath(value).is_absolute() or PureWindowsPath(value).is_absolute()):
                raise ValueError(f'{name}: absolute paths belong in personal configuration')
    return len(servers)


def validate_declared_agents(config: dict, config_path: Path) -> int:
    """Declared roles point to an existing file under .codex/agents; pf- roles are discovered, not declared."""
    declared = config.get('agents', {})
    count = 0
    for name, declaration in declared.items():
        if name in GLOBAL_AGENT_MODEL_KEYS or not isinstance(declaration, dict):
            continue
        if is_portfolio_agent(name):
            raise ValueError(f'{name} is a native pf- role: it is discovered from .codex/agents, do not declare it')
        relative = declaration.get('config_file')
        if (not isinstance(relative, str) or PurePosixPath(relative).is_absolute()
                or PureWindowsPath(relative).is_absolute()):
            raise ValueError(f'Invalid config_file for {name}')
        target = (config_path.parent / relative).resolve()
        agents_dir = (config_path.parent / 'agents').resolve()
        if not target.is_relative_to(agents_dir) or not target.is_file():
            raise ValueError(f'Missing or out-of-folder agent file for {name}: {relative}')
        count += 1
    return count


def validate_native_references(instructions: str, root: Path) -> None:
    """The files a native role is told to read exist inside the checkout."""
    pattern = r'(?<![\w./-])((?:\.codex|docs|libs|apps|tools|docker|ansible)/(?:[\w.-]+/)*[\w.-]+\.(?:md|ts|mjs|mts|json|css|yml))\b'
    for relative in re.findall(pattern, instructions):
        target = (root / relative).resolve()
        if not target.is_relative_to(root.resolve()) or not target.is_file():
            raise ValueError(f'Missing or out-of-checkout agent reference: {relative}')
