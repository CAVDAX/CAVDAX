#!/usr/bin/env python3
"""
audit_readme.py — Suneet Master README Verification & Invariant Audit Harness
Architected by Suneet Chugh (Suneet Master Skill Creator Swarm)

Mechanical static verification harness for README files.
Validates:
  1. Zero-Emoji Invariant (EM-01)
  2. Mojibake & C1 Control Characters (ENC-01, ENC-02)
  3. Marketing Fog Words & Slop Language (COPY-01, COPY-02)
  4. Mermaid Diagram Syntax & Node Label Wrapping (MMD-01 - MMD-05)
  5. Badge Uniformity (shields.io style=for-the-badge) (BDG-01)
  6. Dual-Theme Logo Invariant (<picture> dark/light) (LOGO-01)
  7. Broken File Links & Local Anchor Slugs (LNK-01, LNK-02)
  8. Fake Metric & Vanity Statistic Detection (MET-01)

Exit Codes:
  0: All invariants pass (Clean audit)
  1: Gate failure (One or more S1 violations detected, or S2 in --strict mode)
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

# Reconfigure Windows console output for clean UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ---------------------------------------------------------------------------
# ANSI Color Palettes & Formatting
# ---------------------------------------------------------------------------
class Colors:
    def __init__(self, enabled: bool = True):
        self.enabled = enabled

    def _c(self, code: str) -> str:
        return code if self.enabled else ""

    @property
    def RESET(self) -> str: return self._c("\033[0m")
    @property
    def BOLD(self) -> str: return self._c("\033[1m")
    @property
    def DIM(self) -> str: return self._c("\033[2m")
    @property
    def RED(self) -> str: return self._c("\033[31m")
    @property
    def GREEN(self) -> str: return self._c("\033[32m")
    @property
    def YELLOW(self) -> str: return self._c("\033[33m")
    @property
    def BLUE(self) -> str: return self._c("\033[34m")
    @property
    def MAGENTA(self) -> str: return self._c("\033[35m")
    @property
    def CYAN(self) -> str: return self._c("\033[36m")
    @property
    def WHITE(self) -> str: return self._c("\033[37m")
    @property
    def BG_RED(self) -> str: return self._c("\033[41m\033[37m\033[1m")
    @property
    def BG_GREEN(self) -> str: return self._c("\033[42m\033[30m\033[1m")


# ---------------------------------------------------------------------------
# Violation Data Structure
# ---------------------------------------------------------------------------
@dataclass
class Violation:
    rule_id: str
    severity: str  # "S1" (Critical / Gate Failure), "S2" (Structural Warning), "S3" (Advisory)
    category: str
    message: str
    line_number: int
    snippet: str
    remediation: str


# ---------------------------------------------------------------------------
# Marketing Fog Words & Slop Catalog
# ---------------------------------------------------------------------------
FOG_WORDS_S1 = [
    r"seamless(?:ly)?",
    r"revolutioniz(?:e|ing|es|ed)",
    r"cutting-edge",
    r"cutting edge",
    r"game-changing",
    r"game changer",
    r"supercharg(?:e|ing|ed|es)",
    r"unleash(?:ing|ed|es)?",
    r"delve(?:s|d|ing)?",
    r"tapestry",
    r"robust",
    r"effortless(?:ly)?",
    r"frictionless",
    r"unparalleled",
    r"best-in-class",
    r"world-class",
    r"transform your",
    r"elevate your",
    r"unlock the power of",
    r"unlock your",
    r"harness the power of",
    r"in today's fast-paced world",
    r"in today's digital landscape",
    r"say goodbye to",
    r"say hello to",
    r"everything you need to",
    r"all in one place",
    r"one-stop-shop",
    r"paradigm shift",
    r"magic(?:ally)?",
]

FOG_WORDS_S2 = [
    r"powerful",
    r"intuitive",
    r"innovative",
    r"scalable",
    r"leverage",
    r"leveraging",
    r"state-of-the-art",
    r"next-generation",
    r"next-gen",
    r"ai-powered",
    r"ai-native",
    r"empower(?:ing)? your",
    r"empowering teams",
    r"streamline your",
    r"accelerate your",
    r"holistic",
    r"end-to-end",
    r"mission-critical",
    r"crafted with passion",
    r"turn ideas into reality",
]

# ---------------------------------------------------------------------------
# Emoji Range Regex (Unicode planes 0 & 1)
# ---------------------------------------------------------------------------
EMOJI_PATTERN = re.compile(
    r"["
    r"\U0001F300-\U0001F5FF"  # Misc symbols & pictographs
    r"\U0001F600-\U0001F64F"  # Emoticons
    r"\U0001F680-\U0001F6FF"  # Transport & map
    r"\U0001F900-\U0001F9FF"  # Supplemental symbols & pictographs
    r"\U0001FA70-\U0001FAFF"  # Symbols & Pictographs Extended-A
    r"\U0001F780-\U0001F7FF"  # Geometric Shapes Extended
    r"\U0001F1E6-\U0001F1FF"  # Regional Indicator Symbols (Flags)
    r"\u2600-\u26FF"          # Misc symbols
    r"\u2700-\u27BF"          # Dingbats
    r"\uFE0E\uFE0F"          # Variation selectors
    r"\U0001F3FB-\U0001F3FF"  # Skin tone modifiers
    r"]",
    flags=re.UNICODE,
)

# Mojibake Signatures
MOJIBAKE_SIGNATURES = re.compile(
    r"(?:[\x80-\x9f]|â€|Ã©|Ã¨|Ã |Ã¡|Ã³|Ã±|Ã§|Ã¼|Ã¶|Ã¤|à¤|à¥|á±|Â·|Â°|â„¢|\ufffd)"
)

# Supported Mermaid Diagram Types
SUPPORTED_MERMAID_TYPES = {
    "flowchart lr", "flowchart td", "flowchart tb", "flowchart rl", "flowchart bt",
    "graph lr", "graph td", "graph tb", "graph rl", "graph bt",
    "sequencediagram", "statediagram-v2", "statediagram",
    "classdiagram", "erdiagram", "gitgraph", "mindmap", "timeline",
    "xychart-beta", "sankey-beta", "block-beta"
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def truncate(text: str, max_len: int = 80) -> str:
    cleaned = re.sub(r"\s+", " ", text.strip())
    return cleaned if len(cleaned) <= max_len else cleaned[: max_len - 1] + "…"


def heading_to_slug(text: str) -> str:
    # GitHub markdown heading anchor algorithm
    slug = text.strip().lower()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug)
    return slug


# ---------------------------------------------------------------------------
# Audit Harness Engine
# ---------------------------------------------------------------------------
class ReadmeAuditor:
    def __init__(self, file_path: str, strict: bool = False):
        self.file_path = os.path.abspath(file_path)
        self.base_dir = os.path.dirname(self.file_path)
        self.strict = strict
        self.violations: List[Violation] = []
        self.raw_text: str = ""
        self.lines: List[str] = []
        self.fenced_blocks: List[Tuple[int, int, str, str]] = []  # (start_line, end_line, lang, content)
        self.code_line_indices: Set[int] = set()
        self.headings: List[Tuple[int, int, str, str]] = []  # (line, level, raw, slug)

    def load(self) -> bool:
        if not os.path.isfile(self.file_path):
            self.violations.append(
                Violation(
                    rule_id="FS-01",
                    severity="S1",
                    category="Filesystem",
                    message=f"Target README file does not exist: {self.file_path}",
                    line_number=0,
                    snippet=self.file_path,
                    remediation="Create or specify a valid path to the README markdown file.",
                )
            )
            return False

        try:
            with open(self.file_path, mode="r", encoding="utf-8", errors="replace") as fh:
                self.raw_text = fh.read()
            self.lines = self.raw_text.splitlines()
        except Exception as ex:
            self.violations.append(
                Violation(
                    rule_id="FS-02",
                    severity="S1",
                    category="Filesystem",
                    message=f"Failed to read file: {ex}",
                    line_number=0,
                    snippet=str(ex),
                    remediation="Verify file read permissions and valid UTF-8 encoding.",
                )
            )
            return False

        self._parse_structure()
        return True

    def _parse_structure(self):
        in_block = False
        block_start = 0
        block_lang = ""
        block_lines = []

        for idx, line in enumerate(self.lines, start=1):
            stripped = line.strip()
            if stripped.startswith("```"):
                if not in_block:
                    in_block = True
                    block_start = idx
                    block_lang = stripped[3:].strip().lower()
                    block_lines = []
                    self.code_line_indices.add(idx)
                else:
                    in_block = False
                    self.code_line_indices.add(idx)
                    self.fenced_blocks.append(
                        (block_start, idx, block_lang, "\n".join(block_lines))
                    )
            elif in_block:
                self.code_line_indices.add(idx)
                block_lines.append(line)
            else:
                m_head = re.match(r"^(#{1,6})\s+(.+)$", stripped)
                if m_head:
                    level = len(m_head.group(1))
                    h_text = m_head.group(2).strip()
                    self.headings.append((idx, level, h_text, heading_to_slug(h_text)))

    def audit_emoji(self):
        for idx, line in enumerate(self.lines, start=1):
            if idx in self.code_line_indices:
                continue

            match = EMOJI_PATTERN.search(line)
            if match:
                emoji_char = match.group(0)
                is_heading = line.strip().startswith("#")
                is_list = re.match(r"^\s*[-*+]\s|^\s*\d+\.\s", line)
                is_table = line.strip().startswith("|")

                context = "heading" if is_heading else ("list item" if is_list else ("table" if is_table else "prose"))
                self.violations.append(
                    Violation(
                        rule_id="EM-01",
                        severity="S1",
                        category="Zero-Emoji Invariant",
                        message=f"Emoji '{emoji_char}' detected in UI/README {context}.",
                        line_number=idx,
                        snippet=truncate(line),
                        remediation="Remove emoji. Replace with contextual monochromatic Lucide line SVGs or monospace glyphs.",
                    )
                )

    def audit_encoding(self):
        for idx, line in enumerate(self.lines, start=1):
            c1_match = re.search(r"[\u0080-\u009f]", line)
            if c1_match:
                self.violations.append(
                    Violation(
                        rule_id="ENC-01",
                        severity="S1",
                        category="Encoding Invariant",
                        message=f"C1 Control character detected (U+{ord(c1_match.group(0)):04X}).",
                        line_number=idx,
                        snippet=truncate(line),
                        remediation="Remove C1 control characters. Ensure file is saved as UTF-8 without Windows-1252 corruption.",
                    )
                )

            mojibake = MOJIBAKE_SIGNATURES.search(line)
            if mojibake:
                self.violations.append(
                    Violation(
                        rule_id="ENC-02",
                        severity="S1",
                        category="Encoding Invariant",
                        message=f"Corrupted double-encoded byte sequence '{mojibake.group(0)}' detected.",
                        line_number=idx,
                        snippet=truncate(line),
                        remediation="File was saved with CP1252/Latin-1 round-trip. Restore original UTF-8 characters.",
                    )
                )

    def audit_marketing_fog(self):
        for idx, line in enumerate(self.lines, start=1):
            if idx in self.code_line_indices:
                continue

            scrubbed = re.sub(r"`[^`]+`", "", line)

            for pat in FOG_WORDS_S1:
                rx = re.compile(r"\b" + pat + r"\b", re.IGNORECASE)
                m = rx.search(scrubbed)
                if m:
                    self.violations.append(
                        Violation(
                            rule_id="COPY-01",
                            severity="S1",
                            category="Marketing Fog & Slop",
                            message=f"Critical AI fog phrase '{m.group(0)}' detected.",
                            line_number=idx,
                            snippet=truncate(line),
                            remediation="Rewrite with concrete, physically-grounded nouns and technical specifications.",
                        )
                    )

            for pat in FOG_WORDS_S2:
                rx = re.compile(r"\b" + pat + r"\b", re.IGNORECASE)
                m = rx.search(scrubbed)
                if m:
                    self.violations.append(
                        Violation(
                            rule_id="COPY-02",
                            severity="S2",
                            category="Marketing Fog & Slop",
                            message=f"Cliché marketing word '{m.group(0)}' detected.",
                            line_number=idx,
                            snippet=truncate(line),
                            remediation="Replace generic adjective with verifiable system metrics or architectural capabilities.",
                        )
                    )

    def audit_mermaid(self):
        for start_ln, end_ln, lang, content in self.fenced_blocks:
            if lang != "mermaid":
                continue

            m_lines = content.splitlines()
            if not m_lines:
                self.violations.append(
                    Violation(
                        rule_id="MMD-01",
                        severity="S1",
                        category="Mermaid Diagram Linter",
                        message="Empty Mermaid diagram block.",
                        line_number=start_ln,
                        snippet="```mermaid",
                        remediation="Provide valid Mermaid diagram code or remove the block.",
                    )
                )
                continue

            first_non_empty = ""
            first_ln_offset = 0
            for offset, ln in enumerate(m_lines):
                if ln.strip() and not ln.strip().startswith("%%"):
                    first_non_empty = ln.strip()
                    first_ln_offset = offset
                    break

            norm_header = re.sub(r"\s+", " ", first_non_empty.lower())
            header_valid = False
            for supported in SUPPORTED_MERMAID_TYPES:
                if norm_header.startswith(supported):
                    header_valid = True
                    break

            if not header_valid:
                self.violations.append(
                    Violation(
                        rule_id="MMD-02",
                        severity="S1",
                        category="Mermaid Diagram Linter",
                        message=f"Unsupported or missing Mermaid diagram type: '{first_non_empty}'.",
                        line_number=start_ln + 1 + first_ln_offset,
                        snippet=first_non_empty,
                        remediation="Use supported headers: 'flowchart LR', 'flowchart TD', 'graph TB', 'sequenceDiagram', etc.",
                    )
                )

            subgraph_stack = []
            for offset, m_line in enumerate(m_lines):
                cur_ln = start_ln + 1 + offset
                s_line = m_line.strip()
                if not s_line or s_line.startswith("%%"):
                    continue

                if re.match(r"^subgraph\b", s_line, re.IGNORECASE):
                    subgraph_stack.append(cur_ln)
                elif s_line.lower() == "end":
                    if subgraph_stack:
                        subgraph_stack.pop()
                    else:
                        self.violations.append(
                            Violation(
                                rule_id="MMD-03",
                                severity="S1",
                                category="Mermaid Diagram Linter",
                                message="Orphaned 'end' statement without matching 'subgraph'.",
                                line_number=cur_ln,
                                snippet=s_line,
                                remediation="Ensure every 'end' corresponds to an active 'subgraph'.",
                            )
                        )

                if re.search(r"--\s+>|==\s+>", s_line):
                    self.violations.append(
                        Violation(
                            rule_id="MMD-04",
                            severity="S1",
                            category="Mermaid Diagram Linter",
                            message="Broken link arrow syntax detected (spacing between hyphen/equals and bracket).",
                            line_number=cur_ln,
                            snippet=s_line,
                            remediation="Use solid unbroken arrows: '-->', '==>', or '-.->'.",
                        )
                    )

                # Check for unquoted node labels with special chars
                # Handles normal square brackets id[text], rounded id(text), etc.
                # Ignores valid cylindrical nodes id[("text")] or subroutine id[["text"]]
                if re.search(r'\b\w+\s*\[\(\s*"[^"]+"\s*\)\]', s_line) or re.search(r'\b\w+\s*\[\[\s*"[^"]+"\s*\]\]', s_line):
                    pass  # correctly quoted cylindrical or subroutine node

                # Match id[...] where inside content contains ()[]: but is NOT wrapped in double quotes
                bracket_matches = re.finditer(r'\b\w+\s*\[(?!\s*\(?"\s*)([^\n\]]*?[\(\):][^\n\]]*?)\]', s_line)
                for bm in bracket_matches:
                    inner = bm.group(1).strip()
                    # Skip if inner is cylindrical syntax that starts with (" and ends with ")
                    if inner.startswith('("') and inner.endswith('")'):
                        continue
                    if inner.startswith('["') and inner.endswith('"]'):
                        continue
                    self.violations.append(
                        Violation(
                            rule_id="MMD-05",
                            severity="S1",
                            category="Mermaid Diagram Linter",
                            message="Node label containing special characters '()', '[]', or ':' must be double-quoted.",
                            line_number=cur_ln,
                            snippet=bm.group(0),
                            remediation=f'Wrap label in double quotes: id["{inner}"]',
                        )
                    )

            if subgraph_stack:
                for unclosed_ln in subgraph_stack:
                    self.violations.append(
                        Violation(
                            rule_id="MMD-03",
                            severity="S1",
                            category="Mermaid Diagram Linter",
                            message="Unclosed 'subgraph' block missing matching 'end'.",
                            line_number=unclosed_ln,
                            snippet=self.lines[unclosed_ln - 1],
                            remediation="Close the subgraph with an 'end' keyword.",
                        )
                    )

    def audit_badges(self):
        badge_regex = re.compile(r"https?://img\.shields\.io/[^\s)\"'>]+", re.IGNORECASE)
        for idx, line in enumerate(self.lines, start=1):
            if idx in self.code_line_indices:
                continue

            for match in badge_regex.finditer(line):
                badge_url = match.group(0)
                if "style=for-the-badge" not in badge_url.lower():
                    self.violations.append(
                        Violation(
                            rule_id="BDG-01",
                            severity="S2",
                            category="Badge Uniformity",
                            message="shields.io badge is missing uniform '?style=for-the-badge' parameter.",
                            line_number=idx,
                            snippet=truncate(badge_url, 70),
                            remediation="Append '?style=for-the-badge' to ensure unified typographic badge scale.",
                        )
                    )

    def audit_dual_theme_logo(self):
        header_lines = self.lines[:50]
        header_text = "\n".join(header_lines)

        has_picture = "<picture" in header_text.lower()
        logo_img_match = re.search(r"!\[(.*?(?:logo|banner|brand).*?)\]\((.*?)\)|<img[^>]+src=[\"']([^\"']*(?:logo|banner|brand)[^\"']*)[\"']", header_text, re.IGNORECASE)

        if logo_img_match and not has_picture:
            matched_line = 1
            matched_snippet = logo_img_match.group(0)
            for idx, ln in enumerate(header_lines, start=1):
                if matched_snippet in ln or (logo_img_match.group(2) and logo_img_match.group(2) in ln):
                    matched_line = idx
                    break

            self.violations.append(
                Violation(
                    rule_id="LOGO-01",
                    severity="S2" if not self.strict else "S1",
                    category="Dual-Theme Logo Invariant",
                    message="Header logo lacks dual-theme (<picture>) dark/light responsive presentation.",
                    line_number=matched_line,
                    snippet=truncate(matched_snippet),
                    remediation=(
                        'Use GitHub-standard <picture> syntax:\n'
                        '  <picture>\n'
                        '    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">\n'
                        '    <source media="(prefers-color-scheme: light)" srcset="assets/logo-light.svg">\n'
                        '    <img alt="Project Logo" src="assets/logo-light.svg">\n'
                        '  </picture>'
                    ),
                )
            )

    def audit_links(self):
        link_rx = re.compile(r"\[([^\]]*)\]\(([^)]+)\)|<(?:a|img)[^>]+(?:href|src)=[\"']([^\"']+)[\"']", re.IGNORECASE)
        slug_set = {slug for _, _, _, slug in self.headings}

        for idx, line in enumerate(self.lines, start=1):
            if idx in self.code_line_indices:
                continue

            for m in link_rx.finditer(line):
                target = m.group(2) or m.group(3)
                if not target:
                    continue

                target = target.strip()
                if re.match(r"^(?:https?|mailto|ftp|tel):", target, re.IGNORECASE):
                    continue

                if target.startswith("#"):
                    anchor = target[1:].lower()
                    if anchor and anchor not in slug_set:
                        self.violations.append(
                            Violation(
                                rule_id="LNK-02",
                                severity="S2",
                                category="Internal Anchor",
                                message=f"Internal anchor '{target}' does not match any document heading slug.",
                                line_number=idx,
                                snippet=truncate(line),
                                remediation=f"Verify heading slug. Available slugs: {', '.join(sorted(list(slug_set))[:5])}...",
                            )
                        )
                    continue

                file_part = target.split("#")[0]
                if file_part:
                    resolved_path = os.path.normpath(os.path.join(self.base_dir, file_part))
                    if not os.path.exists(resolved_path):
                        self.violations.append(
                            Violation(
                                rule_id="LNK-01",
                                severity="S1",
                                category="Filesystem Link",
                                message=f"Broken local link: referenced file does not exist on disk ('{file_part}').",
                                line_number=idx,
                                snippet=truncate(line),
                                remediation=f"Create file at '{resolved_path}' or correct the relative markdown link path.",
                            )
                        )

    def audit_fake_metrics(self):
        metric_rx = re.compile(
            r"\b(?:"
            r"\d{1,3}(?:,\d{3})*\+\s*(?:teams|developers|engineers|users|companies|enterprises|customers|clients|downloads)\b|"
            r"99\.999?%\s*(?:uptime|sla|availability)\b|"
            r"(?:10x|100x|1000x)\s*(?:faster|speedup|throughput)\b|"
            r"(?:trusted|loved)\s+by\s+(?:over\s+)?\d+\+?|"
            r"fortune\s+500"
            r")",
            re.IGNORECASE,
        )

        for idx, line in enumerate(self.lines, start=1):
            if idx in self.code_line_indices:
                continue

            match = metric_rx.search(line)
            if match:
                has_footnote = bool(re.search(r"\[\^[\w-]+\]|\[[^\]]+\]\(https?://[^)]+\)", line))
                if not has_footnote:
                    self.violations.append(
                        Violation(
                            rule_id="MET-01",
                            severity="S1",
                            category="Truth in Metrics",
                            message=f"Ungrounded vanity metric '{match.group(0)}' without empirical footnote or reference link.",
                            line_number=idx,
                            snippet=truncate(line),
                            remediation="Attach a verifiable footnote '[^1]' or telemetry benchmark link, or remove the vanity statistic.",
                        )
                    )

    def run_all(self):
        if not self.load():
            return
        self.audit_emoji()
        self.audit_encoding()
        self.audit_marketing_fog()
        self.audit_mermaid()
        self.audit_badges()
        self.audit_dual_theme_logo()
        self.audit_links()
        self.audit_fake_metrics()


def print_console_report(auditor: ReadmeAuditor, colors: Colors, min_severity: str = "S2"):
    sev_filter = {"S1": 1, "S2": 2, "S3": 3}.get(min_severity, 2)
    sev_rank = {"S1": 1, "S2": 2, "S3": 3}

    s1_count = sum(1 for v in auditor.violations if v.severity == "S1")
    s2_count = sum(1 for v in auditor.violations if v.severity == "S2")
    s3_count = sum(1 for v in auditor.violations if v.severity == "S3")

    total_slop_points = (s1_count * 3.0) + (s2_count * 1.0) + (s3_count * 0.25)
    is_failed = (s1_count > 0) or (auditor.strict and s2_count > 0)

    print()
    print(f"{colors.BOLD}{colors.CYAN}┌────────────────────────────────────────────────────────────────────────┐{colors.RESET}")
    print(f"{colors.BOLD}{colors.CYAN}│        SUNEET MASTER README VERIFICATION & INVARIANT HARNESS           │{colors.RESET}")
    print(f"{colors.BOLD}{colors.CYAN}└────────────────────────────────────────────────────────────────────────┘{colors.RESET}")
    print(f"{colors.DIM}Target:{colors.RESET} {auditor.file_path}")
    print(f"{colors.DIM}Size:{colors.RESET}   {len(auditor.raw_text):,} bytes | {len(auditor.lines)} lines")
    print(f"{colors.DIM}Mode:{colors.RESET}   Strict Gate ({'ENABLED' if auditor.strict else 'DISABLED'}) | Threshold: {min_severity}")
    print()

    displayed_violations = [v for v in auditor.violations if sev_rank.get(v.severity, 3) <= sev_filter]

    if not displayed_violations:
        print(f"  {colors.BG_GREEN} PASS {colors.RESET} {colors.GREEN}Zero invariant violations detected. README is pristine.{colors.RESET}")
        print()
    else:
        print(f"{colors.BOLD}Violations Breakdown ({len(displayed_violations)} reported):{colors.RESET}")
        print("-" * 72)
        for v in displayed_violations:
            sev_badge = f"{colors.RED}[S1 BLOCKER]{colors.RESET}" if v.severity == "S1" else f"{colors.YELLOW}[S2 WARNING]{colors.RESET}"
            print(f"  {sev_badge} {colors.BOLD}{v.rule_id}{colors.RESET} - Line {v.line_number} ({v.category})")
            print(f"    {colors.RED if v.severity == 'S1' else colors.YELLOW}Issue:{colors.RESET} {v.message}")
            if v.snippet:
                print(f"    {colors.DIM}Code:{colors.RESET}  {colors.WHITE}{v.snippet}{colors.RESET}")
            print(f"    {colors.CYAN}Fix:{colors.RESET}   {v.remediation}")
            print()

    print("=" * 72)
    status_badge = f"{colors.BG_RED} GATE FAILED {colors.RESET}" if is_failed else f"{colors.BG_GREEN} GATE PASSED {colors.RESET}"
    print(f"  Final Verdict:  {status_badge}")
    print(f"  S1 Blockers:    {colors.RED if s1_count > 0 else colors.GREEN}{s1_count}{colors.RESET}")
    print(f"  S2 Warnings:    {colors.YELLOW if s2_count > 0 else colors.GREEN}{s2_count}{colors.RESET}")
    print(f"  S3 Advisories:  {s3_count}")
    print(f"  Slop Density:   {colors.BOLD}{total_slop_points:.2f} pts{colors.RESET}")
    print("=" * 72)
    print()


def main():
    parser = argparse.ArgumentParser(
        description="Suneet Master README Verification & Audit Harness.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "file",
        nargs="?",
        default="./README.md",
        help="Path to README markdown file (default: ./README.md)",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output structured JSON report for CI/CD runners",
    )
    parser.add_argument(
        "--strict",
        action="store_true",
        help="Enforce strict gate: fail (exit 1) on any S2 warning as well as S1",
    )
    parser.add_argument(
        "--min-severity",
        choices=["S1", "S2", "S3"],
        default="S2",
        help="Minimum severity to display in report (default: S2)",
    )
    parser.add_argument(
        "--no-color",
        action="store_true",
        help="Disable ANSI colors in terminal output",
    )

    args = parser.parse_args()

    use_color = (
        not args.no_color
        and not os.environ.get("NO_COLOR")
        and (sys.stdout.isatty() or os.environ.get("FORCE_COLOR") == "1")
    )
    colors = Colors(enabled=use_color)

    auditor = ReadmeAuditor(file_path=args.file, strict=args.strict)
    auditor.run_all()

    s1_count = sum(1 for v in auditor.violations if v.severity == "S1")
    s2_count = sum(1 for v in auditor.violations if v.severity == "S2")
    is_failed = (s1_count > 0) or (args.strict and s2_count > 0)

    if args.json:
        payload = {
            "file": auditor.file_path,
            "passed": not is_failed,
            "metrics": {
                "s1_blockers": s1_count,
                "s2_warnings": s2_count,
                "s3_advisories": sum(1 for v in auditor.violations if v.severity == "S3"),
                "total_slop_points": (s1_count * 3.0) + (s2_count * 1.0),
            },
            "violations": [asdict(v) for v in auditor.violations],
        }
        print(json.dumps(payload, indent=2))
    else:
        print_console_report(auditor, colors, min_severity=args.min_severity)

    sys.exit(1 if is_failed else 0)


if __name__ == "__main__":
    main()
