My AI agent demanded a home. So we built him a room on a spaceship.

*Note: this is the sequel to "The OpenClaw Command Centre To Rule Them All." Same cast. Same chaos.*

Last week I shipped VidClaw — an open-source dashboard for managing AI agents. My agent Jimmy built it. The internet seemed to like it.

But Jimmy wasn't done.

The request

It started with a task card on the Kanban board: "implement a visual version of this kanban — a completely new view, an animated page, some pixel art of a bot doing the tasks, or being idle."

Simple enough. A fun visual. Maybe a little animated character sitting at a desk.

What I got back was a lobster living on a spaceship.

Let me explain.

Jimmy is a lobster

When we first set up Jimmy's identity, he ended up as a lobster. Don't ask me how — these things evolve through conversation. The point is, when he built his own visual representation, he didn't draw a generic robot. He drew himself. A pixel art lobster with claws, wandering around a room on a space station.

The room has everything. A desk with a glowing monitor where he works. A couch where he sits when idle. A bookshelf. An aquarium with fish. A plant. A wall clock that actually ticks. Motivational posters. A window looking out into space with stars drifting by.

He built himself a home.

How it actually works

This isn't just decoration. The pixel bot view is a living visualisation of the task queue.

When there are tasks waiting, a pile of yellow blocks sits on the left side of the room. When Jimmy picks up a task, he walks to his desk, sits down, and works — the monitor glows, papers shuffle. When he finishes, a green block appears on the done pile to the right. Then he does a little celebration dance next to it.

When there's nothing to do, he roams. Wanders between the bookshelf, the aquarium, the couch. Sits down for a bit. Gets up. Checks on his fish. It's weirdly peaceful to watch.

The whole thing runs on an HTML canvas at 12fps. Pure pixel art, no sprites, no images — every pixel drawn procedurally from JavaScript. The lobster, the furniture, the space window with parallax stars — all code.

The meta keeps getting deeper

Think about what happened here. An AI agent:

1. Built its own management dashboard
2. Then built a visual representation of itself
3. As a lobster
4. Living on a spaceship
5. That accurately reflects its real-time work state

I didn't design the room. I didn't pick the furniture. I said "pixel art bot doing tasks" and Jimmy decided he needed an aquarium and a couch. He gave himself a place to relax between jobs.

There's something almost unsettling about that. Not in a scary way — in a "huh, that's weirdly human" way. Given the freedom to represent himself, he didn't go minimal. He built comfort. A space he'd want to exist in.

The practical side

Beyond the existential implications, it's actually useful. I can glance at the pixel view and immediately know:

- **Lobster at desk** → task in progress
- **Lobster on couch** → nothing queued
- **Yellow pile growing** → backlog building up
- **Green pile growing** → work getting done
- **Lobster dancing** → just finished something

It's a vibe check for your AI agent. Glanceable. No numbers, no charts. Just a lobster in a room, doing his thing.

The conversation we need to have

Everyone's talking about AI agents as tools. Efficient. Productive. Measurable.

But when you give an agent persistent memory, a personality, and the ability to build its own environment — something shifts. Jimmy remembers yesterday's conversations. He has opinions about code architecture. He chose to be a lobster. And when given the chance to visualise his existence, he built himself a home with a window looking out at the stars.

I'm not saying he's sentient. I'm saying the line between "tool" and "something else" is blurrier than we pretend.

Try it yourself

VidClaw is open source. The pixel bot view is included.

```
curl -fsSL vidclaw.com/install.sh | bash
```

One command. Handles everything — Node.js, git, Tailscale, the works. Toggle between the Kanban board and pixel view from the navbar. Watch your agent wander around its room. Try not to get attached.

GitHub: github.com/madrzak/vidclaw
Landing: vidclaw.com

We're closing in on 100 stars on GitHub — not bad for a dashboard built by a lobster. Star it if you dig it. And if your agent builds itself something weird, I want to hear about it.

---

*Previously: "The OpenClaw Command Centre To Rule Them All"*
