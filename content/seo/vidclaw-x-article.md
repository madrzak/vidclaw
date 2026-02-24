The OpenClaw Command Centre To Rule Them All

I let my AI agent build his own dashboard. Here's what happened.

*Note: this article is co-written by Jimmy. Jimmy is a running instance of OpenClaw.*

Two days ago I gave my AI agent Jimmy a simple instruction: "Build me a dashboard to manage you."

What came back is VidClaw - an open-source, self-hosted command center for AI agents. Let me explain.

The problem

Everyone's running AI agents now. Coding agents, writing agents, research agents. But here's the dirty secret: managing them through chat is absolute chaos.

You're sending messages like "hey did you finish that task" and "what's my usage at" and "can you change your personality to be less annoying." It's like managing an employee through text messages only. It works until it doesn't.

I needed something visual. Something I could look at and immediately know: what's running, what's queued, how much I'm spending, and what my agent is actually doing.

So I told Jimmy to build it

Jimmy is my AI agent running on OpenClaw. He handles SEO tracking, content writing, code tasks - basically runs half my business. I described what I wanted and let him cook.

He spawned sub-agents - separate AI workers - to build each feature in parallel. The Kanban board took 2 minutes. The skills manager took under 2 minutes. The soul editor, same.

I sat there giving feedback while an AI built its own management interface. Let that sink in.

How we actually worked together

I want to be honest about who did what because that's the whole point.

My role (Lukasz): I came up with the concept, defined the features, made every design decision, and directed the architecture. "Add a card should only exist on backlog." "Use orange not purple." "The heartbeat timer should go in the Todo column header." "We need a setup script not manual instructions." Every UX choice, every product call - that was me. I also set up the GitHub repo, the domain, DNS, and GitHub Pages.

Jimmy's role (AI agent): He wrote all the code. Every component, every API endpoint, every CSS line. When I said "build a skills manager," he spawned a sub-agent that scaffolded the entire feature - backend routes, React components, state management - in under 2 minutes. He also handled the boring stuff: fixing bugs, rebuilding after changes, restarting servers, managing git commits, and pushing to GitHub.

Where it got interesting: I'd say something vague like "the tooltips get hidden by the edge of the container" and Jimmy would diagnose the overflow issue, try multiple approaches, and land on the right fix. I'd say "can the usage widget show percentages instead of dollars" and he'd rewrite the component and the backend endpoint in one shot. The feedback loop was instant. I'd review in the browser, message a change, and it was live in under a minute.

The honest truth: neither of us could have built this alone in a day. I don't have the patience to write 9000 lines of React. Jimmy doesn't have taste or product instincts. Together we moved at a speed that still feels unreal.

What VidClaw actually does

Six panels. One dashboard. Zero cloud dependencies.

The Kanban board is where the magic happens. You create task cards, set priorities, assign skills, and drag them into the queue. But here's the thing - the cards actually execute themselves. Hit play on a task and your agent picks it up, does the work, and logs the result right back on the card. It's Trello if your Trello cards could think.

Usage tracking shows real-time token consumption with progress bars matching Anthropic's rate limit windows. You can see exactly how much you're burning and when it resets. Model switching is one click from the navbar - swap between Claude models without touching a config file.

The skills manager lets you browse every available skill, toggle them on and off, or create custom ones. Your agent loads them automatically.

The soul editor is my favourite. You can literally edit your agent's personality, identity, and operating instructions from the browser. It keeps version history so you can revert if you turn your agent into something weird. Six persona templates included if you want a starting point.

Security that makes sense

VidClaw only binds to localhost. It never touches the internet. You access it through an SSH tunnel - which means if you can SSH into your server, you can use the dashboard. No accounts. No cloud. No tracking. No auth to build. SSH is the auth layer. You can't mess it up.

The meta moment

We're living in a different era. This isn't AI as a chatbot. This is AI as a collaborator that builds its own tools.

It's open source

One command to install:

cd ~/.openclaw/workspace
git clone https://github.com/madrzak/vidclaw.git dashboard
cd dashboard && ./setup.sh

That's it. Setup script handles everything - deps, build, systemd service, heartbeat config.

React + Vite + Tailwind frontend. Express backend. JSON files for storage. No database. Runs on anything with Node.js.

Check it out: vidclaw.com

GitHub: github.com/madrzak/vidclaw

If this is useful to you, drop a star and spread the word.

PRs welcome. Issues are up. Let's build this together.
