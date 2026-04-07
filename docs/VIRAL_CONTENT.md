# Meld Viral Content Playbook

## Twitter/X 콘텐츠 전략

### Launch Thread (D-Day)

```
🧵 Thread: Why we built Meld (and why it's different from every AI coding tool)

1/10 Every AI coding tool today does the same thing:
"Give me a prompt → Generate new code"

But here's the problem:
99% of developers aren't building NEW apps.
They're maintaining EXISTING ones.

2/10 We asked ourselves:
"What if AI could understand YOUR codebase?"

Not a blank canvas.
YOUR messy, legacy, production code.

That's Meld.

3/10 Here's what makes us different:

❌ Cursor: Generates code in a new file
✅ Meld: Edits your existing components

❌ v0: Creates throwaway prototypes
✅ Meld: Transforms your production codebase

4/10 Demo time.

[VIDEO: 90-second migration from CRA to Next.js App Router]

No manual changes.
No copy-paste.
Just "migrate this to App Router" → done.

5/10 But we didn't stop there.

Click any element in your live app.
Tell AI what to change.
Watch it happen in real-time.

[VIDEO: Visual editor demo]

6/10 The secret sauce?

"Smart Context" - Meld learns YOUR coding style.
- Your naming conventions
- Your folder structure
- Your preferred libraries

It writes code like YOU would.

7/10 And it connects to everything:

• Figma → Click design, modify code
• GitHub → Commit changes directly
• Vercel → Deploy in one click
• 14 MCP servers total

8/10 Why desktop app?

• Your code never leaves your machine
• Works offline
• Direct filesystem access
• No upload limits

Privacy matters.

9/10 We're launching TODAY:

🆓 Free: 50 AI requests/month
💼 Pro: $29/month unlimited
🏢 Team: $49/user/month

Link in bio 👇

10/10 Try it:
→ [링크]

Star us on GitHub:
→ [GitHub 링크]

Join our Discord:
→ [Discord 링크]

RT if you've ever wished AI could just edit your existing code instead of making new files 🙏
```

### Daily Content Calendar (Week 1)

| Day | 시간 | 콘텐츠 타입 | 내용 |
|-----|------|-----------|------|
| D+0 | 10:00 | Launch Thread | 위 스레드 |
| D+0 | 14:00 | Demo Video | Figma → Code |
| D+0 | 18:00 | Retweet 감사 | "Wow, front page of HN!" |
| D+1 | 10:00 | Use Case | "레거시 jQuery 마이그레이션" |
| D+1 | 15:00 | Behind Scenes | "Day 1 numbers: X signups" |
| D+2 | 10:00 | Tutorial | "Meld in 60 seconds" |
| D+2 | 16:00 | User Shoutout | RT 사용자 피드백 |
| D+3 | 10:00 | Technical Deep Dive | "How Smart Context works" |
| D+3 | 14:00 | Comparison | "Cursor vs Meld (honest take)" |
| D+4 | 10:00 | Problem/Solution | "디자인 핸드오프 문제" |
| D+5 | 10:00 | Milestone | "1000 users in 5 days!" |
| D+6 | 10:00 | Feature Spotlight | "MCP Servers explained" |
| D+7 | 10:00 | Week 1 Recap | "What we learned" |

---

## Hacker News 게시물

### Show HN Post (D-Day)

**Title:**
```
Show HN: Meld – AI IDE that edits existing codebases (not generates new ones)
```

**Body:**
```
Hey HN,

I've been building Meld for the past 6 months. It's a desktop IDE that uses AI to edit your existing codebase, rather than generating new code from scratch.

Why I built this:

I was frustrated with AI coding tools that could only generate new files. As someone who maintains a 3-year-old Next.js app, I needed something that could understand my existing code structure and make changes in place.

What makes Meld different:

1. It reads your entire project and learns your coding patterns
2. You can click any element in your running app and tell AI what to change
3. It connects to Figma - click a design element, and it modifies the corresponding React component
4. Everything runs locally - your code never leaves your machine

Tech stack: Electron + Next.js 16 + Claude API

Demo video: [link]

Try it: [link]

GitHub: [link]

I'm here to answer questions. What do you think?
```

### HN 댓글 대응 전략

**예상 질문과 답변:**

Q: "How is this different from Cursor?"
```
Good question. The key difference is the starting point:

- Cursor: You write a prompt → AI generates new code
- Meld: You point at existing code → AI modifies it

Cursor is great for greenfield projects. Meld is for when you have an existing codebase and want to refactor, migrate, or update it without rewriting from scratch.

We also have visual editing - click any element in your running app and tell AI what to change. That's something Cursor doesn't do.
```

Q: "Why desktop app instead of web?"
```
Three reasons:

1. Privacy: Your code never leaves your machine
2. Performance: Direct filesystem access is faster than uploading
3. Offline: Works without internet (except for AI calls)

We do have a web version for teams who prefer browser-based workflows, but desktop is our primary focus.
```

Q: "What about privacy/security with AI?"
```
Valid concern. Here's how we handle it:

1. Code stays local until you explicitly send it to Claude
2. We only send relevant context (the file you're editing + related imports)
3. Anthropic's usage policy: they don't train on API data
4. We're working on local LLM support for enterprise

Your API key, your data, your control.
```

Q: "How do you handle large codebases?"
```
We use "Smart Context" - a system that:

1. Builds a graph of your imports/exports
2. Only loads files relevant to your current task
3. Summarizes distant dependencies instead of sending full files
4. Caches frequently accessed files

Tested on monorepos up to 100k files. Context window is optimized to stay under Claude's limit while maintaining accuracy.
```

---

## Reddit 게시물

### r/programming

**Title:**
```
We built an AI IDE that edits your existing code instead of generating new projects - here's why
```

**Body:**
```
After 6 months of building, I'm finally sharing what I've been working on.

**The problem:**
Every AI coding tool (Cursor, v0, Bolt) does the same thing - you give it a prompt, it generates new code. Great for prototypes, terrible for existing projects.

I maintain a 3-year-old Next.js app. When I asked AI to "add dark mode," it wanted to rewrite my entire component from scratch instead of just adding a few lines to my existing code.

**The solution:**
Meld is a desktop IDE that understands your existing codebase. You can:

- Click any element in your running app → tell AI what to change
- Point at a Figma design → AI modifies your existing React component
- Say "migrate to App Router" → it updates your files in place

**How it works:**
1. Open your project folder
2. Meld scans your codebase and learns your patterns
3. Click elements or select code to tell AI what to change
4. Review diff → approve → done

**Tech details:**
- Electron + Next.js 16 + TypeScript
- Claude API with optimized context management
- MCP protocol for external integrations (Figma, GitHub, etc.)
- Behavioral learning (remembers your code style)

**What it's NOT:**
- Not a "generate app from prompt" tool
- Not a Cursor replacement (different use cases)
- Not cloud-dependent (runs locally)

Demo: [link]
GitHub: [link]

Happy to answer questions about the implementation or use cases.
```

### r/webdev

**Title:**
```
Tired of AI tools that can't work with your existing codebase? I built something different.
```

**Body:**
```
Quick rant first:

I love v0 and Bolt for prototyping. But the moment I try to use AI on my real project - a 200+ component React app - it falls apart.

"Add a loading spinner to this button"
AI: *rewrites the entire component*

"Use my existing Button component"
AI: *imports a brand new Button from nowhere*

Sound familiar?

---

So I built Meld. Here's the workflow:

1. **Open your existing project** (no upload, no cloud)
2. **Run your dev server** (Meld detects it automatically)
3. **Click any element** in your running app
4. **Tell AI what to change** ("make this red", "add hover effect")
5. **See the diff**, approve, done

The AI actually reads your codebase. It knows:
- Your naming conventions
- Your folder structure
- Which components already exist
- Your preferred styling approach

**Figma integration** (this is the cool part):

Connect your Figma → click a design element → Meld finds the corresponding React component → modifies it to match the design.

No more "let me just grab these values manually."

---

Free tier: 50 AI requests/month
Pro: $29/month

Try it: [link]
Demo video: [link]

What do you think? Would this fit your workflow?
```

### r/reactjs

**Title:**
```
Meld: Click any element in your React app, tell AI what to change
```

**Body:**
```
Hey React devs!

I built a tool that I think you'll find useful. It's called Meld, and the core feature is this:

**Click any element in your running React app → AI modifies that exact component**

Demo: [30-second GIF]

How it works:

1. Meld injects a tiny inspector script into your dev server
2. When you click an element, it identifies the React component
3. You type what you want ("add loading state", "change color to blue")
4. AI reads the actual component file
5. Shows you a diff
6. One click to apply

**Why this is better than just pasting into ChatGPT:**

- It knows your component's imports
- It knows your design system/UI library
- It preserves your coding style
- It modifies in place (no copy-paste)

**Also works with Figma:**

Connect Figma → click a design node → it finds the matching React component → updates it to match the design.

---

Built with: Electron, Next.js 16, TypeScript, Claude API

Free to try: [link]
GitHub: [link]

Feedback welcome! Especially interested in:
- What React-specific features would you want?
- Any pain points with current AI coding tools?
```

---

## YouTube 영상 스크립트

### Demo Video 1: "Meld in 90 Seconds"

```
[0:00 - Hook]
"What if AI could edit your existing code, not just generate new files?"

[0:05 - Problem]
"Every AI coding tool today does the same thing. Give it a prompt, get new code.
But what about your existing project? That 3-year-old codebase you actually work on?"

[0:15 - Solution]
"Meet Meld. The AI IDE that understands your codebase."

[0:20 - Demo Start]
"Here's a real Next.js app I've been working on. Let me show you what Meld can do."

[0:25 - Visual Editor]
"I click this button in my running app. Meld knows exactly which component it is.
I type: 'Add a loading spinner when clicked.'
Here's the diff. One click to apply. Done."

[0:45 - Figma Integration]
"Now let's connect Figma. Here's a design update from my designer.
I click this updated card design. Meld finds my existing Card component.
'Match this Figma design.' And it updates my code to match."

[1:05 - Smart Context]
"The secret? Smart Context. Meld reads your entire project.
It knows your naming conventions. Your folder structure. Your preferred libraries.
It writes code like YOU would."

[1:20 - Call to Action]
"Try Meld free. Link in description.
Edit your existing code with AI."

[1:30 - End]
```

### Demo Video 2: "Legacy Migration in 60 Seconds"

```
[0:00 - Hook]
"Watch me migrate a Create React App to Next.js 15 in 60 seconds."

[0:05 - Setup]
"This is a real CRA project. 50 components. Class components. Old routing."

[0:10 - Command]
"I open it in Meld and say: 'Migrate this to Next.js 15 App Router.'"

[0:15 - Processing]
"Meld is analyzing the codebase... identifying patterns... planning the migration..."

[0:25 - Changes]
"Here come the changes. Let me scroll through these diffs.
- Page routes converted to app directory
- Class components → functional + hooks
- Old React Router → Next.js routing
- All imports updated"

[0:45 - Apply]
"I'll approve all changes. Applied."

[0:50 - Test]
"Let's run it... npm run dev... and it works."

[0:55 - Result]
"50 components. Fully migrated. Under a minute."

[1:00 - End]
"Meld. Edit existing code with AI."
```

---

## Product Hunt 페이지

### Tagline
```
Edit your existing codebase with AI - not generate new prototypes
```

### Description
```
Meld is a desktop IDE that uses AI to edit your existing code, not just generate new files.

🎯 Click any element in your running app → tell AI what to change
🎨 Connect Figma → click design → modify existing components
🧠 Smart Context learns your coding style and patterns
🔒 100% local - your code never leaves your machine

Unlike Cursor or v0 that focus on generating new code, Meld is built for developers who maintain existing projects and need AI that understands their codebase.

Try it free today.
```

### Maker Comment
```
Hey Product Hunt! 👋

I'm [Name], and I've been building Meld for the past 6 months.

The idea came from frustration. I was using AI coding tools on my side project, and they were great - until I tried to use them on my real job's codebase.

The AI kept wanting to rewrite everything from scratch instead of just making the small change I needed.

So I built Meld - an IDE where AI actually reads your project, learns your patterns, and edits your existing code in place.

Key features:
• Visual editing - click elements in your running app
• Figma integration - design to code without copy-paste
• Smart Context - AI learns YOUR coding style
• Desktop-first - your code stays local

We're launching with a generous free tier (50 AI requests/month) and Pro at $29/month.

I'm here all day to answer questions. What would you want AI to help with in your existing projects?

🙏
```

---

## Email Templates

### Influencer Outreach

**Subject:** Meld - AI IDE that edits existing code (exclusive early access)

```
Hi [Name],

I'm building Meld, an AI IDE with a different approach - instead of generating new code, it edits your existing codebase.

Why I'm reaching out:
I've followed your content on [React/Next.js/AI coding tools] and think your audience would find this interesting.

What makes Meld different:
• Click any element in your running app → AI modifies that component
• Connect Figma → click design → it updates your existing code
• Smart Context learns your coding style

I'd love to give you early access before our public launch on [date]. No strings attached - just hoping for honest feedback.

Quick demo (90 seconds): [link]

Would you be interested?

Best,
[Name]
```

### Enterprise Outreach

**Subject:** Reducing codebase maintenance time with AI

```
Hi [Name],

I noticed [Company] is using [React/Next.js/specific tech]. I'm reaching out because we built a tool that helps teams maintain existing codebases faster.

The problem we solve:
Most AI coding tools generate new code. But enterprise teams spend 80% of their time maintaining existing systems. Meld is built specifically for this - AI that reads your codebase and makes changes in place.

What we offer:
• Visual editing - click any element to modify
• Design sync - Figma integration for design system consistency
• Learning engine - AI adapts to your coding standards
• 100% on-premise option available

We're offering 3 enterprise pilots this month with dedicated support.

Would you have 15 minutes to see a demo?

Best,
[Name]
```

---

*문서 작성일: 2026-04-07*
