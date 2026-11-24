#!/bin/zsh
set -e
cd "$(dirname "$0")"
/Applications/Godot.app/Contents/MacOS/Godot --headless --path "$PWD" --editor --import
exec /Applications/Godot.app/Contents/MacOS/Godot --path "$PWD"
