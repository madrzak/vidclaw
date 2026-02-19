# Changelog

All notable changes to VidClaw will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Channel Routing** - Route tasks to specific channels (Telegram topics, Discord threads, Slack channels) to preserve conversation context and memory
  - Auto-discovers channels from live OpenClaw sessions
  - Optional `vidclaw-channels.json` config for friendly channel names
  - Color-coded channel badges on task cards for visual grouping
  - Channel selector only appears when multiple channels are available
  - Works with any OpenClaw channel type (Telegram, Discord, Slack, etc.)
  - See `vidclaw-channels.example.json` for configuration format

### Changed
- **Workspace Path Detection** - VidClaw now reads the actual workspace path from OpenClaw config instead of assuming `~/.openclaw/workspace`
  - Fixes SOUL.md, skills, and memory files not appearing when using a custom workspace location
  - Backward compatible with default workspace paths

### Fixed
- Skills from custom workspace locations now appear in the Skills Manager
- SOUL.md editor now works correctly regardless of workspace location
- File browser now respects OpenClaw's configured workspace path

## [1.1.2] - 2024-02-XX

_(Previous releases - to be documented)_

[Unreleased]: https://github.com/madrzak/vidclaw/compare/v1.1.2...HEAD
[1.1.2]: https://github.com/madrzak/vidclaw/releases/tag/v1.1.2
