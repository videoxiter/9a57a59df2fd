# Скиллы, видимые агенту

## user-agents (148)

| skill | в каталоге модели | описание |
|---|---|---|
| `agent-introspection-debugging` | да | Structured self-debugging workflow for AI agent failures using capture, diagnosis, contained recovery, and introspection |
| `agent-self-evaluation` | да | Use after completing any non-trivial task. The agent self-rates its output on 5 axes — accuracy, completeness, clarity,  |
| `agent-sort` | да | Build an evidence-backed ECC install plan for a specific repo by sorting skills, commands, rules, hooks, and extras into |
| `ai-regression-testing` | да | Regression testing strategies for AI-assisted development. Sandbox-mode API testing without database dependencies, autom |
| `architecture-decision-records` | да | Capture architectural decisions as numbered ADR markdown files in docs/adr/ with context, alternatives considered, conse |
| `browser-qa` | да | Run automated post-deploy UI verification with a browser automation MCP (Codex-in-chrome, Playwright, or Puppeteer): con |
| `canvas-design` | да | Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user  |
| `ck` | да | Persistent per-project memory for Codex (Context Keeper) driven by deterministic Node.js /ck commands: init, save, resum |
| `click-path-audit` | да | Trace every user-facing button/touchpoint through its full state change sequence to find bugs where functions individual |
| `code-tour` | да | Create CodeTour `.tour` files — persona-targeted, step-by-step walkthroughs with real file and line anchors. Use for onb |
| `codebase-onboarding` | да | Analyze an unfamiliar codebase and generate a structured onboarding guide with architecture map, key entry points, conve |
| `codehealth-mcp` | да | Real-time structural Code Health via CodeScene MCP — review before edits, verify score deltas after changes, gate commit |
| `config-gc` | да | Garbage collection for your Codex configuration. Periodically scans ~/.Codex (skills, memory, hooks, permissions, MCP se |
| `configure-ecc` | да | Run the conversational ECC setup wizard inside the current harness: inventory the install, collect scope (user/project/l |
| `context-budget` | да | Audits Codex context window consumption across agents, skills, MCP servers, and rules. Identifies bloat, redundant compo |
| `continuous-learning` | да | [DEPRECATED - use continuous-learning-v2] Legacy v1 stop-hook skill extractor. v2 is a strict superset with instinct-bas |
| `continuous-learning-v2` | да | Instinct-based learning system that observes sessions via hooks, creates atomic instincts with confidence scoring, and e |
| `council` | да | Convene a four-voice council for ambiguous decisions, tradeoffs, and go/no-go calls. Use when multiple valid paths exist |
| `council-multi-model` | да | Add one optional external Codex critique after the existing council has produced a decision draft. Use when an ambiguous |
| `delivery-gate` | да | Stop hook that blocks Codex from finishing until quality checks pass. Detects rationalization patterns (surface text heu |
| `design-taste-frontend` | да | tasteskill v2, the anti-slop frontend skill. Art direction for websites, distilled from a study of 247 curated gallery s |
| `dev-team` | да | Simulate a collaborative dev team session where multiple role-based personas (PM, Architect, Developer, QA) respond to t |
| `diploma-antiplag` | да | Проверка и подготовка диплома/ВКР к прохождению антиплагиата и ИИ-детектора (Антиплагиат.ВУЗ и аналоги). Сканирует текст |
| `diploma-defense` | да | Презентация и защита ВКР/диплома перед ГЭК (технические вузы РФ). Структура 10–15 слайдов под 5–7 мин по официальному ре |
| `diploma-format` | да | Оформление ВКР/диплома по формальным требованиям вуза (заголовки, содержание, нумерация страниц и источников, дефисы, БД |
| `dubbing` | да | Dub audio and video into other languages using the ElevenLabs Dubbing API (dubbing_v2), preserving the original speakers |
| `e2e-testing` | да | Playwright E2E testing patterns, Page Object Model, configuration, CI/CD integration, artifact management, and flaky tes |
| `ecc-guide` | да | Answer questions about ECC by reading the live repo surface — agents, skills, commands, hooks, rules, install profiles,  |
| `ecc-recipes` | да | Map a described workflow to the right ECC command group with run-order and stop condition, or browse all command-group r |
| `edge-tts` | да | Text-to-speech conversion using `uvx edge-tts` for generating audio from text. Use when (1) User requests audio/voice ou |
| `error-handling` | да | Patterns for robust error handling across TypeScript, Python, and Go. Covers typed errors, error boundaries, retries, ci |
| `eval-harness` | да | Eval-driven development (EDD) framework for AI coding sessions — define capability and regression evals before coding, g |
| `ffmpeg-skill` | да | Edit video and audio with local FFmpeg from natural-language requests: cut, trim, join, resize/reframe (9:16, 1:1), spee |
| `figma` | да | Bring Figma into a HyperFrames video - rendered assets, brand tokens, components, storyboard frames as reconstructed mot |
| `frontend-design` | да | Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one. Helps with aesthe |
| `git-workflow` | да | Git workflow patterns including branching strategies, commit conventions, keeping history clean and readable, tidying lo |
| `growth-log` | да | Write growth log entries that extract reusable patterns from completed work — root cause, transferable rule, and a recog |
| `hookify-rules` | да | Create and configure hookify rules — markdown files with YAML frontmatter that match bash, file, prompt, or stop events  |
| `hyperframes` | да | Read first to make, edit, animate or render any video with HyperFrames (HTML rendered to video), including launch films, |
| `hyperframes-cli` | да | The HyperFrames CLI by job - scaffold, check, look at frames, edit the timeline, preview, render locally or in the cloud |
| `hyperframes-registry` | да | About 450 ready-made HyperFrames blocks and components installed as editable source - transitions, overlays, titles, kin |
| `inherit-legacy-style` | да | Prevent AI style drift on legacy projects by scanning the codebase for implicit conventions, resolving conflicts with th |
| `intent-driven-development` | да | Turn ambiguous or high-impact product and engineering changes into scoped, verifiable acceptance criteria before or alon |
| `iterative-retrieval` | да | Pattern for progressively refining context retrieval to solve the subagent context problem. Use when a subagent lacks th |
| `living-docs-governance` | да | Keep a long-lived project's documentation from rotting by assigning existing project docs clear constitution, map, statu |
| `loop-design-check` | да | Design a goal-oriented agent loop or review one for failure modes: spinning, Goodhart-gaming the verifier, or running a  |
| `media-use` | да | Get or make any media for a HyperFrames video - music, sound effects, images, icons, logos, voiceover, avatar and genera |
| `music` | да | Generate music using ElevenLabs Music API. Use when creating instrumental tracks, songs with lyrics, background music, j |
| `plan-canvas` | да | Open plans and HTML artifacts in a local browser canvas where the human annotates elements, chats, and approves or reque |
| `plankton-code-quality` | да | Write-time code quality enforcement using Plankton — auto-formatting, linting, and Codex-powered fixes on every file edi |
| `product-lens` | да | Validate the why before building through four product diagnostics — a YC-style product diagnostic that produces PRODUCT- |
| `production-audit` | да | Local-evidence production readiness audit for shipped apps, pre-launch reviews, post-merge checks, and "what breaks in p |
| `remotion-best-practices` | да | Router for all Remotion skills |
| `remotion-captions` | да | Transcribing, displaying and animating captions |
| `remotion-create` | да | Create a new Remotion video |
| `remotion-docs` | да | Search Remotion documentation |
| `remotion-interactivity` | да | Structure Remotion markup for interactivity |
| `remotion-maps` | да | Remotion Map animation knowledge |
| `remotion-markup` | да | Content, animation and effects best practices |
| `remotion-multimedia` | да | Interacting with Mediabunny |
| `remotion-render` | да | Export a Remotion video |
| `remotion-saas` | да | Build an app with Remotion |
| `remotion-studio` | да | Preview a Remotion video |
| `remotion-to-hyperframes` | да | Bring existing video code or footage into HyperFrames and verify it frame by frame against the original - Remotion first |
| `remotion-upgrade` | да | Upgrade Remotion, and related packages |
| `repo-scan` | да | Bootstrap pointer that installs the external repo-scan skill from a pinned, reviewable commit. Use when repo-scan must b |
| `rules-distill` | да | Scan skills to extract cross-cutting principles and distill them into rules — append, revise, or create new rule files.  |
| `russian-voiceover` | да | Russian-language voiceover (озвучка) for video. Use when the user wants Russian narration, a Russian voice-over track, o |
| `santa-method` | да | Multi-agent adversarial verification: two independent reviewers with the same rubric must both pass before output ships, |
| `setup-api-key` | да | Fix or hand-configure an existing ElevenLabs API key. Use when a key stopped working (401 or invalid_api_key), when an a |
| `skill-comply` | да | Visualize whether skills, rules, and agent definitions are actually followed — auto-generates scenarios at 3 prompt stri |
| `skill-scout` | да | Search existing local, marketplace, GitHub, and web skill sources before creating a new skill. Use when the user wants t |
| `skill-stocktake` | да | Use when auditing Codex skills and commands for quality. Supports Quick Scan (changed skills only) and Full Stocktake mo |
| `slideshow` | да | Build a HyperFrames slideshow to present live - slides, fragment reveals, branching hotspots and presenter mode with spe |
| `slidev` | да | Create and present web-based slidedecks for developers using Slidev with Markdown, Vue components, code highlighting, an |
| `sound-effects` | да | Generate sound effects from text descriptions using ElevenLabs. Use when creating sound effects, generating audio textur |
| `source-command-aside` | да | Answer a quick side question without interrupting or losing context from the current task. Resume work automatically aft |
| `source-command-auto-update` | да | Pull the latest ECC repo changes and reinstall the current managed targets. |
| `source-command-build-fix` | да | Detect the project build system and incrementally fix build/type errors with minimal safe changes. |
| `source-command-cost-report` | да | Generate a local Codex cost report from the ECC cost-tracker metrics log. Use for a terminal summary or CSV export of tr |
| `source-command-cpp-build` | да | Fix C++ build errors, CMake issues, and linker problems incrementally. Invokes the cpp-build-resolver agent for minimal, |
| `source-command-cpp-review` | да | Comprehensive C++ code review for memory safety, modern C++ idioms, concurrency, and security. Invokes the cpp-reviewer  |
| `source-command-cpp-test` | да | Enforce TDD workflow for C++. Write GoogleTest tests first, then implement. Verify coverage with gcov/lcov. |
| `source-command-ecc-guide` | да | Navigate ECC's current agents, skills, commands, hooks, install profiles, and docs from the live repository surface. Thi |
| `source-command-epic-claim` | да | Claim an epic issue, stamp coordination state, and sync local ownership. |
| `source-command-epic-decompose` | да | Break an epic into task children without creating task branches. |
| `source-command-epic-publish` | да | Publish a validated epic update back to the issue and local cache. |
| `source-command-epic-review` | да | Mark epic review requested, approved, or changes requested. |
| `source-command-epic-sync` | да | Sync epic issue bodies, labels, and local coordination snapshots from GitHub. |
| `source-command-epic-unblock` | да | Sweep blocked epic issues and reopen anything whose dependencies are closed. |
| `source-command-epic-validate` | да | Validate epic readiness, dependencies, and coordination policy. |
| `source-command-evolve` | да | Analyze instincts and suggest or generate evolved structures |
| `source-command-fastapi-review` | да | Review a FastAPI application for architecture, async correctness, dependency injection, Pydantic schemas, security, perf |
| `source-command-feature-dev` | да | Guided feature development with codebase understanding and architecture focus |
| `source-command-flutter-build` | да | Fix Dart analyzer errors and Flutter build failures incrementally. Invokes the dart-build-resolver agent for minimal, su |
| `source-command-flutter-review` | да | Review Flutter/Dart code for idiomatic patterns, widget best practices, state management, performance, accessibility, an |
| `source-command-flutter-test` | да | Run Flutter/Dart tests, report failures, and incrementally fix test issues. Covers unit, widget, golden, and integration |
| `source-command-go-build` | да | Fix Go build errors, go vet warnings, and linter issues incrementally. Invokes the go-build-resolver agent for minimal,  |
| `source-command-go-review` | да | Comprehensive Go code review for idiomatic patterns, concurrency safety, error handling, and security. Invokes the go-re |
| `source-command-gradle-build` | да | Fix Gradle build errors for Android and KMP projects |
| `source-command-hookify` | да | Create hooks to prevent unwanted behaviors from conversation analysis or explicit instructions. Use to generate a new ho |
| `source-command-hookify-configure` | да | Enable or disable hookify rules interactively |
| `source-command-hookify-help` | да | Get help with the hookify system |
| `source-command-hookify-list` | да | List all configured hookify rules |
| `source-command-instinct-export` | да | Export instincts from project/global scope to a file |
| `source-command-instinct-import` | да | Import instincts from file or URL into project/global scope |
| `source-command-instinct-status` | да | Show learned instincts (project + global) with confidence |
| `source-command-jira` | да | Retrieve a Jira ticket, analyze requirements, update status, or add comments. Uses the jira-integration skill and MCP or |
| `source-command-kotlin-build` | да | Fix Kotlin/Gradle build errors, compiler warnings, and dependency issues incrementally. Invokes the kotlin-build-resolve |
| `source-command-kotlin-test` | да | Enforce TDD workflow for Kotlin. Write Kotest tests first, then implement. Verify 80%+ coverage with Kover. |
| `source-command-learn` | да | Extract reusable patterns from the current session and save them as candidate skills or guidance. Use to review a sessio |
| `source-command-learn-eval` | да | Extract reusable patterns from the session, self-evaluate quality before saving, and determine the right save location ( |
| `source-command-marketing-campaign` | да | Plan and execute a full marketing campaign. Accepts a product brief and returns positioning, landing page copy, email se |
| `source-command-plan` | да | Restate requirements, assess risks, and create step-by-step implementation plan. WAIT for user CONFIRM before touching a |
| `source-command-plan-canvas` | да | Open a plan or HTML artifact in the browser Plan Canvas for annotate-and-approve review. This is a thin slash-command en |
| `source-command-project-init` | да | Detect a project's stack and produce a dry-run ECC onboarding plan using the repository's install manifests and stack ma |
| `source-command-projects` | да | List known projects and their instinct statistics |
| `source-command-promote` | да | Promote project-scoped instincts to global scope |
| `source-command-prune` | да | Delete pending instincts older than 30 days that were never promoted. Thin CLI wrapper for continuous-learning-v2's inst |
| `source-command-python-review` | да | Comprehensive Python code review for PEP 8 compliance, type hints, security, and Pythonic idioms. Invokes the python-rev |
| `source-command-react-test` | да | Enforce TDD workflow for React. Write React Testing Library tests first (behavior-focused, accessibility-first), then im |
| `source-command-refactor-clean` | да | Safely identify and remove dead code with verification after each change. |
| `source-command-resume-session` | да | Load the most recent session file from ~/.Codex/session-data/ and resume work with full context from where the last sess |
| `source-command-review-pr` | да | Comprehensive PR review using specialized agents (code-reviewer, comment-analyzer, pr-test-analyzer, silent-failure-hunt |
| `source-command-rust-build` | да | Fix Rust build errors, borrow checker issues, and dependency problems incrementally. Invokes the rust-build-resolver age |
| `source-command-rust-review` | да | Comprehensive Rust code review for ownership, lifetimes, error handling, unsafe usage, and idiomatic patterns. Invokes t |
| `source-command-save-session` | да | Save current session state to a dated file in ~/.Codex/session-data/ so work can be resumed in a future session with ful |
| `source-command-setup-pm` | да | Configure your preferred package manager (npm/pnpm/yarn/bun) |
| `source-command-skill-create` | да | Analyze local git history to extract coding patterns and generate SKILL.md files. Local version of the Skill Creator Git |
| `source-command-skill-health` | да | Show skill portfolio health dashboard with charts and analytics. Use for the quantitative usage/success-rate dashboard;  |
| `source-command-test-coverage` | да | Analyze coverage, identify gaps, and generate missing tests toward the target threshold. |
| `source-command-update-codemaps` | да | Scan project structure and generate token-lean architecture codemaps. |
| `source-command-update-docs` | да | Sync documentation from source-of-truth files such as scripts, schemas, routes, and exports. |
| `source-command-vue-review` | да | Comprehensive Vue.js code review for Composition API correctness, reactivity, composable patterns, template security, ac |
| `speech-to-text` | да | Transcribe audio to text using ElevenLabs Scribe v2. Use when converting audio/video to text, generating subtitles, tran |
| `strategic-compact` | да | Suggests manual context compaction at logical intervals to preserve context through task phases rather than arbitrary au |
| `subtitle-skill` | да | Deterministic subtitle validation, SRT/WebVTT generation, and video caption burn-in. Given an already-decided, typed sub |
| `tdd-workflow` | да | Test-driven development workflow: write a failing test first, watch it fail, implement the smallest change to green, the |
| `text-to-speech` | да | Convert text to speech using ElevenLabs voice AI. Use when generating audio from text, creating voiceovers, building voi |
| `theme-factory` | да | Toolkit for styling artifacts with a theme. These artifacts can be slides, docs, reportings, HTML landing pages, etc. Th |
| `transcription-skill` | да | Transcribe speech in audio or video files (mp4, mov, mkv, wav, m4a, mp3) into a structured, timestamped Transcript with  |
| `unified-memory` | да | Share durable, inspectable context and handoffs between Codex, Codex, Hermes, Cursor, OpenCode, and other agents through |
| `verification-before-completion` | да | Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verifi |
| `verification-loop` | да | Run a six-phase verification of a Codex session's work — build, type check, lint, tests with coverage, security grep, an |
| `video-use` | да | Edit any video by conversation. Transcribe, cut, color grade, generate overlay animations, burn subtitles — for talking  |
| `voice-changer` | да | Transform the voice in an audio recording into a different target voice while preserving emotion, timing, and delivery u |
| `voice-isolator` | да | Remove background noise and isolate vocals/speech from audio using ElevenLabs Voice Isolator (audio isolation) API. Use  |
| `windows-desktop-e2e` | да | E2E testing for Windows native desktop apps (WPF, WinForms, Win32/MFC, Qt) using pywinauto and Windows UI Automation. Us |
