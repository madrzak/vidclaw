import { ACTUAL_WORKSPACE, OPENCLAW_JSON } from '../config.js';
import { exec } from '../lib/exec.js';
import fs from 'fs';
import path from 'path';

/**
 * Consistent color hash for channel IDs.
 * Uses a curated palette that works well on dark/light backgrounds.
 */
function hashChannelColor(channelId) {
  if (!channelId) return '#6B7280'; // gray for main session
  
  const palette = [
    '#EF4444', // red
    '#F59E0B', // amber
    '#10B981', // green
    '#3B82F6', // blue
    '#8B5CF6', // violet
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316', // orange
    '#6366F1', // indigo
    '#06B6D4', // cyan
  ];
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < channelId.length; i++) {
    hash = ((hash << 5) - hash) + channelId.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return palette[Math.abs(hash) % palette.length];
}

/**
 * Returns available channels for task routing.
 * Auto-discovers from OpenClaw live sessions + optional user config.
 */
export async function listChannels(req, res) {
  const channels = [
    { id: null, label: 'Main Session', type: 'main', icon: '🏠', color: '#6B7280' }
  ];
  
  try {
    const openclawConfig = JSON.parse(fs.readFileSync(OPENCLAW_JSON, 'utf8'));
    
    // Optional user-defined channel names (backward compatible)
    const channelNamesPath = path.join(ACTUAL_WORKSPACE, 'vidclaw-channels.json');
    let userChannelNames = {};
    if (fs.existsSync(channelNamesPath)) {
      userChannelNames = JSON.parse(fs.readFileSync(channelNamesPath, 'utf8'));
    }
    
    // Try to discover live sessions from OpenClaw (any channel type)
    let discoveredChannels = [];
    try {
      const sessionsOutput = await exec('openclaw sessions list --json');
      const sessionsData = JSON.parse(sessionsOutput);
      
      for (const session of sessionsData.sessions || []) {
        const sessionKey = session.key;
        if (!sessionKey || sessionKey.includes(':subagent:')) continue; // Skip sub-agents
        
        // Parse different session key formats:
        // Telegram topics: "agent:main:telegram:group:-123:topic:4"
        // Discord threads: "agent:main:discord:channel:456:thread:789"
        // Slack channels: "agent:main:slack:channel:C123"
        // Generic pattern: look for any sub-context after the main channel ID
        const telegramMatch = sessionKey.match(/^agent:main:telegram:group:([^:]+):topic:(\d+)/);
        const discordMatch = sessionKey.match(/^agent:main:discord:channel:([^:]+):thread:(\d+)/);
        const slackMatch = sessionKey.match(/^agent:main:slack:channel:([^:]+):thread:(\d+)/);
        
        let channelId, channelType, contextLabel, icon;
        
        if (telegramMatch) {
          const [, groupId, topicId] = telegramMatch;
          channelId = `telegram:${groupId}:topic:${topicId}`;
          channelType = 'telegram';
          contextLabel = userChannelNames[channelId]?.name || `Topic ${topicId}`;
          icon = userChannelNames[channelId]?.icon || '💬';
        } else if (discordMatch) {
          const [, chanId, threadId] = discordMatch;
          channelId = `discord:${chanId}:thread:${threadId}`;
          channelType = 'discord';
          contextLabel = userChannelNames[channelId]?.name || `Thread ${threadId}`;
          icon = userChannelNames[channelId]?.icon || '🧵';
        } else if (slackMatch) {
          const [, chanId, threadId] = slackMatch;
          channelId = `slack:${chanId}:thread:${threadId}`;
          channelType = 'slack';
          contextLabel = userChannelNames[channelId]?.name || `Thread ${threadId}`;
          icon = userChannelNames[channelId]?.icon || '💬';
        }
        
        if (channelId) {
          const parentName = userChannelNames[channelType]?.name || channelType.charAt(0).toUpperCase() + channelType.slice(1);
          
          discoveredChannels.push({
            id: channelId,
            label: `${parentName} (${contextLabel})`,
            type: channelType,
            icon: icon,
            color: hashChannelColor(channelId)
          });
        }
      }
    } catch (err) {
      console.warn('Live session discovery failed, user will only see Main Session:', err.message);
    }
    
    // Deduplicate discovered channels
    const seen = new Set();
    for (const ch of discoveredChannels) {
      if (!seen.has(ch.id)) {
        channels.push(ch);
        seen.add(ch.id);
      }
    }
    
  } catch (err) {
    console.warn('Channel discovery error:', err.message);
  }
  
  res.json(channels);
}
