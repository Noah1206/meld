import { NextRequest, NextResponse } from "next/server";

function parseGithubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  return match ? { owner: match[1], repo: match[2] } : null;
}

const SKILL_FILE_CANDIDATES = [
  "CLAUDE.md",
  ".claude/CLAUDE.md",
  ".claude/commands.md",
  ".claude/settings.json",
  "SKILL.md",
  "skill.md",
  "README.md",
];

// Parse README/CLAUDE.md to extract structured skill data
function parseSkillContent(files: Record<string, string>): {
  rules: string;
  commands: Array<{ name: string; description: string; usage?: string }>;
  references: Array<{ name: string; description: string }>;
  workflows: Array<{ name: string; steps: string[] }>;
  antiPatterns: string[];
} {
  const allContent = Object.values(files).join("\n\n");

  // Extract commands (lines starting with / in tables or lists)
  const commands: Array<{ name: string; description: string; usage?: string }> = [];
  const cmdRegex = /[|*-]\s*`?(\/[\w-]+)`?\s*[|:—-]+\s*(.+)/g;
  let match;
  while ((match = cmdRegex.exec(allContent)) !== null) {
    const name = match[1].trim();
    const desc = match[2].replace(/\|/g, "").trim();
    if (name && desc && !commands.find(c => c.name === name)) {
      commands.push({ name, description: desc });
    }
  }

  // Also catch "## Commands" or "## Usage" sections with /command patterns
  const cmdBlockRegex = /(?:^|\n)(\/[\w-]+)\s+[-–—]\s+(.+)/gm;
  while ((match = cmdBlockRegex.exec(allContent)) !== null) {
    const name = match[1].trim();
    const desc = match[2].trim();
    if (!commands.find(c => c.name === name)) {
      commands.push({ name, description: desc });
    }
  }

  // Extract usage examples for commands
  const usageRegex = /```[^`]*?(\/[\w-]+\s+\S+[^`]*)```/g;
  while ((match = usageRegex.exec(allContent)) !== null) {
    const examples = match[1].trim().split("\n").filter(l => l.startsWith("/"));
    for (const ex of examples) {
      const cmdName = ex.match(/^(\/[\w-]+)/)?.[1];
      const cmd = commands.find(c => c.name === cmdName);
      if (cmd && !cmd.usage) {
        cmd.usage = ex.trim();
      }
    }
  }

  // Extract references (tables with Reference/Covers or Name/Description)
  const references: Array<{ name: string; description: string }> = [];
  const refRegex = /\|\s*([\w-]+)\s*\|\s*(.+?)\s*\|/g;
  while ((match = refRegex.exec(allContent)) !== null) {
    const name = match[1].trim();
    const desc = match[2].trim();
    if (name && desc && name !== "Reference" && name !== "Name" && name !== "---" && !name.startsWith("-")) {
      references.push({ name, description: desc });
    }
  }

  // Extract workflows (numbered lists or "→" chains)
  const workflows: Array<{ name: string; steps: string[] }> = [];
  const workflowRegex = /(?:\/[\w-]+\s*(?:→|->|\/)\s*)+\/[\w-]+/g;
  while ((match = workflowRegex.exec(allContent)) !== null) {
    const steps = match[0].split(/\s*(?:→|->|\/)\s*/).filter(s => s.startsWith("/"));
    if (steps.length >= 2) {
      workflows.push({ name: steps.join(" → "), steps });
    }
  }
  // Also catch "audit → normalize → polish" style
  const chainRegex = /(\w+)\s*→\s*(\w+)(?:\s*→\s*(\w+))?/g;
  while ((match = chainRegex.exec(allContent)) !== null) {
    const steps = [match[1], match[2], match[3]].filter(Boolean).map(s => `/${s}`);
    if (steps.length >= 2 && !workflows.find(w => w.name === steps.join(" → "))) {
      workflows.push({ name: steps.join(" → "), steps });
    }
  }

  // Extract anti-patterns
  const antiPatterns: string[] = [];
  const antiRegex = /(?:Don't|BANNED|avoid|never)\s+(.+)/gi;
  while ((match = antiRegex.exec(allContent)) !== null) {
    const pattern = match[1].replace(/[*`]/g, "").trim();
    if (pattern.length > 5 && pattern.length < 200) {
      antiPatterns.push(pattern);
    }
  }

  // Rules = everything that's not parsed into specific categories
  // Truncate to fit token budget
  const rules = allContent.slice(0, 4000);

  return { rules, commands, references, workflows, antiPatterns: antiPatterns.slice(0, 10) };
}

export async function POST(req: NextRequest) {
  try {
    const { githubUrl, action } = (await req.json()) as { githubUrl: string; action: "fetch" | "info" };
    const parsed = parseGithubUrl(githubUrl);
    if (!parsed) {
      return NextResponse.json({ error: "Invalid GitHub URL" }, { status: 400 });
    }

    const { owner, repo } = parsed;
    const token = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    if (action === "info") {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!res.ok) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
      const data = await res.json();
      return NextResponse.json({
        name: data.name,
        description: data.description,
        stars: data.stargazers_count,
        owner: data.owner?.login,
        defaultBranch: data.default_branch,
      });
    }

    // action === "fetch"
    const files: Record<string, string> = {};

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) return NextResponse.json({ error: "Repo not found" }, { status: 404 });
    const repoData = await repoRes.json();
    const branch = repoData.default_branch || "main";

    // Fetch candidate files
    for (const filePath of SKILL_FILE_CANDIDATES) {
      try {
        const fileRes = await fetch(
          `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (fileRes.ok) {
          files[filePath] = await fileRes.text();
        }
      } catch {}
    }

    // Fetch .claude/ directory
    try {
      const treeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers }
      );
      if (treeRes.ok) {
        const treeData = await treeRes.json();
        const skillFiles = (treeData.tree || [])
          .filter((f: { path: string; type: string }) =>
            f.type === "blob" && (
              f.path.startsWith(".claude/") ||
              f.path.startsWith(".cursor/") ||
              f.path === "CLAUDE.md" ||
              f.path === "SKILL.md" ||
              f.path.endsWith(".skill.md") ||
              f.path.endsWith(".cursorrules")
            )
          )
          .map((f: { path: string }) => f.path);

        for (const fp of skillFiles) {
          if (files[fp]) continue;
          try {
            const fRes = await fetch(
              `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fp}`,
              { headers: token ? { Authorization: `Bearer ${token}` } : {} }
            );
            if (fRes.ok) {
              files[fp] = await fRes.text();
            }
          } catch {}
        }
      }
    } catch {}

    if (Object.keys(files).length === 0) {
      return NextResponse.json({ error: "No skill files found in repo" }, { status: 404 });
    }

    // Parse structured skill data
    const parsed_skill = parseSkillContent(files);

    return NextResponse.json({
      repo: `${owner}/${repo}`,
      branch,
      files,
      // Structured data
      commands: parsed_skill.commands,
      references: parsed_skill.references,
      workflows: parsed_skill.workflows,
      antiPatterns: parsed_skill.antiPatterns,
      rules: parsed_skill.rules,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
