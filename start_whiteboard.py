#!/usr/bin/env python3
"""
Launcher for the Arquitetura de Computadores Whiteboard.
Usage: python start_whiteboard.py
"""
import os
import sys
import subprocess

base_dir = os.path.dirname(os.path.abspath(__file__))
whiteboard_server = os.path.join(base_dir, 'whiteboard', 'server.py')

if __name__ == '__main__':
    sys.exit(subprocess.call([sys.executable, whiteboard_server] + sys.argv[1:]))
