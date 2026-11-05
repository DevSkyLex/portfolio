"""Exercise the deployment rsync task with a fake destination and executable."""

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

import yaml


class SynchronizeSshTest(unittest.TestCase):
    def test_synchronize_resolves_custom_port_and_verifies_host(self):
        ansible_root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            log = root / 'rsync.jsonl'
            rsync = root / 'rsync'
            rsync.write_text(
                '#!/usr/bin/env python3\n'
                'import json, os, sys\n'
                'with open(os.environ["RSYNC_TEST_LOG"], "a", encoding="utf-8") as log:\n'
                '    log.write(json.dumps(sys.argv[1:]) + "\\n")\n',
                encoding='utf-8',
            )
            rsync.chmod(0o755)
            ssh = root / 'ssh'
            ssh.write_text('#!/bin/sh\nexit 1\n', encoding='utf-8')
            ssh.chmod(0o755)
            inventory = root / 'inventory.yml'
            inventory.write_text(
                yaml.safe_dump({'all': {'hosts': {'vps': {
                    'ansible_host': '192.0.2.1',
                    'ansible_user': 'fixture',
                    'ansible_port': "{{ lookup('ansible.builtin.env', 'VPS_PORT') | default('22', true) | int }}",
                    'ansible_rsync_path': str(rsync),
                }}}}),
                encoding='utf-8',
            )
            tasks = []
            for role in ('portfolio',):
                role_tasks = yaml.safe_load((ansible_root / f'roles/{role}/tasks/main.yml').read_text(encoding='utf-8'))
                synchronize = next(task['ansible.posix.synchronize'] for task in role_tasks if 'ansible.posix.synchronize' in task)
                synchronize.update(src=str(root) + '/', dest='/tmp/fixture/', rsync_opts=[])
                tasks.append({'name': role, 'ansible.posix.synchronize': synchronize})
            playbook = root / 'test.yml'
            playbook.write_text(yaml.safe_dump([{'hosts': 'vps', 'gather_facts': False, 'tasks': tasks}]), encoding='utf-8')
            env = {**os.environ, 'PATH': f'{root}{os.pathsep}{os.environ["PATH"]}', 'VPS_PORT': '2222', 'RSYNC_TEST_LOG': str(log)}
            result = subprocess.run(
                ['ansible-playbook', '-i', str(inventory), str(playbook)],
                cwd=ansible_root,
                env=env,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            commands = [json.loads(line) for line in log.read_text(encoding='utf-8').splitlines()]
            self.assertEqual(len(commands), 1)
            for command in commands:
                ssh = next(arg for arg in command if arg.startswith('--rsh='))
                self.assertIn('Port=2222', ssh)
                self.assertNotIn('StrictHostKeyChecking=no', ssh)
                self.assertNotIn('UserKnownHostsFile=/dev/null', ssh)


if __name__ == '__main__':
    unittest.main()
