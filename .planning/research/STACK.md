# Visual Brainstorming Techniques Stack

**Project:** AI Visual Brainstorming Assistant
**Researched:** 2026-01-26
**Dimension:** Visual Techniques Inventory

---

## Executive Summary

This document catalogs visual brainstorming techniques an AI facilitator should employ when externalizing user thinking onto an Excalidraw canvas. Each technique has specific **trigger conditions** (when to use it) and **complexity guidance** (how elaborate to make it).

The goal: The AI acts as a "language extension" - proactively converting verbal ideas into visual diagrams without requiring the user to ask.

---

## Technique Categories

Visual brainstorming techniques fall into five functional categories:

| Category | Purpose | Example Techniques |
|----------|---------|-------------------|
| **Divergent** | Generate many ideas | Mind maps, lotus blossom, starbursting |
| **Convergent** | Narrow/prioritize ideas | 2x2 matrices, voting dots, affinity diagrams |
| **Relational** | Show connections | Concept maps, Venn diagrams, fishbone |
| **Sequential** | Show order/flow | User flows, timelines, storyboards |
| **Structural** | Show hierarchy/composition | Tree diagrams, wireframes, canvases |

---

## Technique Inventory

### 1. Mind Map

**What it is:** Radial diagram with central topic and branching subtopics. Fast, intuitive, non-linear.

**When to use (Triggers):**
- User mentions a broad topic for the first time ("Let's brainstorm about X")
- User lists multiple related ideas without structure
- Early exploration phase - idea quantity matters more than organization
- User seems overwhelmed by complexity ("there's so much to think about")

**Complexity guidance:**
- **Simple (3-5 branches):** Initial exploration, single-session brainstorm
- **Medium (6-12 branches, 2 levels deep):** Comprehensive topic exploration
- **Elaborate (3+ levels):** Only if user explicitly wants depth; can overwhelm

**Excalidraw implementation:**
- Central rectangle/ellipse with topic
- Lines radiating outward
- Child nodes as smaller rectangles
- Color-code branches by theme

**Source:** [Mindmaps.com - How to Brainstorm with Mind Maps](https://www.mindmaps.com/how-to-brainstorm-with-mind-maps/), [Creately - Visual Brainstorming Techniques](https://creately.com/guides/visual-brainstorming-techniques/)

---

### 2. Concept Map

**What it is:** Network of concepts connected by labeled relationships. More structured than mind maps; shows HOW ideas relate.

**When to use (Triggers):**
- User asks "how does X relate to Y?"
- Need to show cause-effect or dependency relationships
- Complex domain with multiple interconnections
- User needs to understand existing systems before ideating

**Complexity guidance:**
- **Simple (5-8 nodes):** Single relationship exploration
- **Medium (10-20 nodes):** System understanding
- **Elaborate (20+ nodes):** Only for detailed analysis; becomes hard to read

**Excalidraw implementation:**
- Rectangles for concepts
- Labeled arrows showing relationships (verbs on arrows)
- Allow cross-links unlike mind maps
- Group related concepts spatially

**Source:** [Creately - Concept Map vs Mind Map](https://creately.com/guides/concept-map-vs-mind-map/), [XMind - Concept Map vs Mind Map](https://xmind.com/blog/concept-map-vs-mind-map)

---

### 3. 2x2 Prioritization Matrix

**What it is:** Four-quadrant grid with two axes (typically Effort vs. Value, Urgency vs. Importance).

**When to use (Triggers):**
- User has multiple ideas and needs to prioritize
- User asks "which should we do first?"
- Decision paralysis - too many options
- Resource constraints mentioned ("we can't do everything")
- Comparing tradeoffs

**Complexity guidance:**
- **Always simple:** 4 quadrants, clearly labeled axes
- Never elaborate - the power is in simplicity
- Limit to 8-12 items plotted; more becomes unreadable

**Quadrant naming (Effort vs. Value):**
| Quadrant | Label | Action |
|----------|-------|--------|
| High Value / Low Effort | Quick Wins | Do first |
| High Value / High Effort | Big Bets | Do next |
| Low Value / Low Effort | Maybes | Do if time |
| Low Value / High Effort | Time Sinks | Don't do |

**Excalidraw implementation:**
- Large rectangle divided into 4
- Axis labels on edges
- Small rectangles/ellipses for each item
- Position items by plotting coordinates

**Source:** [ProductPlan - 2x2 Prioritization Matrix](https://www.productplan.com/glossary/2x2-prioritization-matrix/), [Miro - 2x2 Prioritization Matrix](https://miro.com/templates/2x2-prioritization-matrix/), [NN/g - Prioritization Matrices](https://www.nngroup.com/articles/prioritization-matrices/)

---

### 4. Affinity Diagram (Clustering)

**What it is:** Grouping related ideas into themed clusters. Reveals patterns in unstructured data.

**When to use (Triggers):**
- User has generated 10+ unrelated ideas
- Ideas feel scattered/chaotic
- Looking for patterns in brainstorm output
- Post-brainstorm synthesis phase
- User says "how do these all fit together?"

**Complexity guidance:**
- **Simple (3-5 clusters):** Quick synthesis
- **Medium (6-10 clusters):** Comprehensive analysis
- **Elaborate (10+ clusters):** Only for very large datasets (40+ items)

**Excalidraw implementation:**
- Group sticky-note-style rectangles
- Draw loose boundaries around clusters
- Add cluster labels above groups
- Use color to distinguish clusters

**Source:** [IxDF - Affinity Diagrams](https://www.interaction-design.org/literature/article/affinity-diagrams-learn-how-to-cluster-and-bundle-ideas-and-facts), [ASQ - What is an Affinity Diagram](https://asq.org/quality-resources/affinity), [Figma - What is an Affinity Diagram](https://www.figma.com/resource-library/what-is-an-affinity-diagram/)

---

### 5. Starbursting (6 W's)

**What it is:** Star with 6 points representing Who, What, When, Where, Why, How.

**When to use (Triggers):**
- User has settled on ONE idea to explore deeply
- Need comprehensive analysis of a single concept
- Validating/stress-testing an idea
- User asks "what questions should we answer about this?"

**Complexity guidance:**
- **Always medium:** 6 points with 3-5 questions each
- Never simple (defeats purpose) or elaborate (loses focus)

**Excalidraw implementation:**
- Central shape with the idea
- 6 radiating lines to question categories
- Questions branch from each category
- Color-code by question type

**Source:** [SessionLab - Brainstorming Techniques](https://www.sessionlab.com/blog/brainstorming-techniques/), [Box - Visual Brainstorming Techniques](https://blog.box.com/best-visual-brainstorming-techniques)

---

### 6. Lotus Blossom

**What it is:** 3x3 grid with central idea, surrounded by 8 related themes, each of which spawns 8 more ideas.

**When to use (Triggers):**
- Need systematic idea expansion
- User wants to explore multiple facets of one concept
- Looking for unexpected connections
- Deep-dive on a focused topic

**Complexity guidance:**
- **Simple (center + 8):** Quick expansion
- **Full (center + 8 + 64):** Complete lotus blossom; time-intensive
- Only go full when user commits to deep exploration

**Excalidraw implementation:**
- 3x3 grid in center
- 8 surrounding 3x3 grids
- Color-code levels
- Keep spacing consistent

**Source:** [SessionLab - Brainstorming Techniques](https://www.sessionlab.com/blog/brainstorming-techniques/)

---

### 7. User Flow Diagram

**What it is:** Sequential diagram showing steps a user takes to accomplish a task.

**When to use (Triggers):**
- User describes a process or journey
- Discussing how someone will use something
- Planning interactions/screens
- User asks "how will this work?"

**Complexity guidance:**
- **Simple (3-5 steps):** Core happy path only
- **Medium (6-10 steps):** Happy path + key decision points
- **Elaborate (10+ steps with branches):** Full flow with error handling

**Excalidraw implementation:**
- Rounded rectangles for steps
- Diamonds for decisions
- Arrows showing flow direction
- Swimlanes if multiple actors

**Source:** [CareerFoundry - User Flows vs Wireframes](https://careerfoundry.com/en/blog/ux-design/user-flows-vs-wireframes/), [Figma - What is a User Flow](https://www.figma.com/resource-library/user-flow/), [NN/g - Wireflows](https://www.nngroup.com/articles/wireflows/)

---

### 8. Timeline / Roadmap

**What it is:** Linear representation of events or milestones over time.

**When to use (Triggers):**
- User mentions sequence of events
- Planning phased rollout
- Historical analysis
- User asks "when should we do each thing?"

**Complexity guidance:**
- **Simple (3-5 items):** Quick overview
- **Medium (6-12 items):** Detailed plan
- **Elaborate (multiple tracks):** Only if multiple parallel workstreams

**Excalidraw implementation:**
- Horizontal line as axis
- Vertical markers for milestones
- Labels above/below line
- Can use swimlanes for parallel tracks

**Source:** [Miro - Timeline Templates](https://miro.com/templates/timeline/), [Draw.io - Timeline Diagrams](https://www.drawio.com/blog/timeline-diagrams)

---

### 9. SWOT Analysis

**What it is:** 2x2 grid showing Strengths, Weaknesses, Opportunities, Threats.

**When to use (Triggers):**
- Evaluating a strategy, product, or decision
- User mentions competitive analysis
- Assessing internal vs external factors
- User asks "what are the pros and cons?"

**Complexity guidance:**
- **Always medium:** 4 quadrants with 3-5 items each
- More items per quadrant becomes cluttered

**Excalidraw implementation:**
- Large rectangle divided into 4
- Label quadrants S/W/O/T
- Color-code: S=green, W=red, O=blue, T=orange
- Bullet points or sticky notes in each

**Source:** [Asana - SWOT Analysis](https://asana.com/resources/swot-analysis), [Miro - SWOT Analysis Templates](https://miro.com/strategic-planning/swot-analysis-examples/)

---

### 10. Fishbone (Ishikawa) Diagram

**What it is:** Cause-and-effect diagram shaped like a fish skeleton. Categories branch off main spine.

**When to use (Triggers):**
- User identifies a problem to solve
- Root cause analysis needed
- User asks "why is this happening?"
- Debugging/troubleshooting scenarios

**Complexity guidance:**
- **Simple (4-6 bones):** Quick analysis
- **Medium (6 bones with sub-branches):** Standard analysis
- **Elaborate (deep sub-branches):** Complex problems only

**Standard categories (6 M's):**
- Methods, Machines, Materials, Measurements, Mother Nature (Environment), Manpower (People)

**Excalidraw implementation:**
- Horizontal arrow pointing right (spine)
- Diagonal lines angling back (major causes)
- Sub-branches for specific causes
- Problem statement at fish head

**Source:** [ASQ - What is a Fishbone Diagram](https://asq.org/quality-resources/fishbone), [Kaizen - Ishikawa Diagram](https://kaizen.com/insights/ishikawa-diagram-root-cause-analysis/)

---

### 11. Venn Diagram

**What it is:** Overlapping circles showing shared and unique characteristics.

**When to use (Triggers):**
- Comparing 2-3 things
- Finding common ground
- User asks "what do these have in common?"
- Identifying sweet spots/intersections

**Complexity guidance:**
- **Simple (2 circles):** Basic comparison
- **Medium (3 circles):** Three-way comparison
- **Never more than 3:** Becomes visually confusing

**Excalidraw implementation:**
- Large overlapping ellipses
- Labels in unique areas
- Shared items in overlap
- Color-code circles

**Source:** [Lucidchart - Venn Diagram Guide](https://www.lucidchart.com/pages/tutorial/venn-diagram), [Miro - What is a Venn Diagram](https://miro.com/graphs/what-is-a-venn-diagram/)

---

### 12. Pros and Cons List

**What it is:** Two-column comparison of advantages and disadvantages.

**When to use (Triggers):**
- Binary decision (do X or not?)
- User weighing options
- User asks "should we do this?"
- Simple tradeoff analysis

**Complexity guidance:**
- **Always simple:** Two columns, 3-7 items each
- Add weights only if user requests

**Excalidraw implementation:**
- Rectangle divided vertically
- "Pros" header (green) and "Cons" header (red)
- Bullet points in each column

**Source:** [Smartsheet - Pros and Cons Templates](https://www.smartsheet.com/content/pros-vs-cons-template), [Mural - Pros and Cons Template](https://www.mural.co/templates/pros-cons-list)

---

### 13. Wireframe / Layout Sketch

**What it is:** Low-fidelity sketch of a user interface structure.

**When to use (Triggers):**
- User describes a screen/page/interface
- Discussing where elements should go
- User asks "what would this look like?"
- UI/UX brainstorming

**Complexity guidance:**
- **Simple (boxes and labels):** Initial concept
- **Medium (with placeholder text/icons):** Clearer structure
- **Never high-fidelity:** That's design, not brainstorming

**Excalidraw implementation:**
- Rectangles for content areas
- Lines for text placeholders
- X-boxes for images
- Hand-drawn aesthetic is a feature, not a bug

**Source:** [Balsamiq - Wireflows](https://balsamiq.com/blog/wireflows/), [NN/g - Wireflows](https://www.nngroup.com/articles/wireflows/)

---

### 14. Storyboard

**What it is:** Sequential panels showing a narrative/scenario over time.

**When to use (Triggers):**
- User describes a scenario or user journey
- Explaining how something will be experienced
- Presentation planning
- User asks "walk me through how this works"

**Complexity guidance:**
- **Simple (3-4 panels):** Quick scenario
- **Medium (6-8 panels):** Complete journey
- **Elaborate (10+ panels):** Full experience mapping

**Excalidraw implementation:**
- Rectangular frames in sequence
- Stick figures for people
- Speech/thought bubbles
- Captions below frames

**Source:** [CareerFoundry - User Flows vs Wireframes](https://careerfoundry.com/en/blog/ux-design/user-flows-vs-wireframes/)

---

### 15. Tree / Hierarchy Diagram

**What it is:** Top-down branching structure showing parent-child relationships.

**When to use (Triggers):**
- User describes categories/subcategories
- Organizational structure
- Feature breakdown
- User asks "what's under this?"

**Complexity guidance:**
- **Simple (2 levels):** High-level breakdown
- **Medium (3 levels):** Detailed hierarchy
- **Elaborate (4+ levels):** Only if essential; loses readability

**Excalidraw implementation:**
- Rectangles for nodes
- Lines connecting parent to children
- Top-to-bottom or left-to-right layout
- Consistent spacing

**Source:** [Miro - Tree Diagram](https://miro.com/diagramming/what-is-a-tree-diagram/), [Draw.io - Org Charts](https://www.drawio.com/blog/org-charts)

---

### 16. Six Thinking Hats

**What it is:** Structured framework with 6 colored perspectives for examining an idea.

**When to use (Triggers):**
- Group decision-making
- Ensuring all perspectives considered
- User stuck in one mode of thinking
- Comprehensive idea evaluation

**Complexity guidance:**
- **Always medium:** 6 sections, each with 2-4 points
- Structure is the value

**Hat meanings:**
| Hat | Focus |
|-----|-------|
| White | Facts, data, information |
| Red | Feelings, intuition, emotions |
| Yellow | Benefits, optimism, value |
| Black | Risks, caution, problems |
| Green | Creativity, alternatives, new ideas |
| Blue | Process, control, next steps |

**Excalidraw implementation:**
- 6 rectangles or sections
- Color-coded by hat
- Space for notes in each
- Can arrange as circle or grid

**Source:** [Creately - Six Thinking Hats](https://creately.com/guides/what-are-the-six-thinking-hats/), [Miro - Six Thinking Hats](https://miro.com/templates/six-thinking-hats/), [De Bono Group - Six Thinking Hats](https://www.debonogroup.com/services/core-programs/six-thinking-hats/)

---

### 17. Canvas Templates (Business Model, Lean, Value Proposition)

**What it is:** Structured multi-section templates for business analysis.

**When to use (Triggers):**
- Business/product ideation
- User mentions business model, customers, value
- Startup/entrepreneurship context
- User asks "how will this make money?"

**Complexity guidance:**
- **Always follow template:** 9 sections for BMC, 9 for Lean Canvas
- Fill progressively; don't need all sections at once

**Lean Canvas sections:**
1. Problem
2. Solution
3. Key Metrics
4. Unique Value Proposition
5. Unfair Advantage
6. Channels
7. Customer Segments
8. Cost Structure
9. Revenue Streams

**Excalidraw implementation:**
- Pre-divided rectangle
- Section labels
- Sticky-note style content
- Color-code by section type

**Source:** [Miro - Lean Canvas](https://miro.com/templates/lean-canvas/), [Miro - Business Model Canvas](https://miro.com/templates/business-model-canvas/)

---

### 18. Comparison Table

**What it is:** Grid comparing multiple options across multiple criteria.

**When to use (Triggers):**
- User comparing 3+ options
- Multiple evaluation criteria
- User asks "how do these compare?"
- Feature comparison

**Complexity guidance:**
- **Simple (3 options, 4-5 criteria):** Quick comparison
- **Medium (5 options, 8-10 criteria):** Detailed analysis
- **Elaborate (checkmarks, scores):** Only if decision is complex

**Excalidraw implementation:**
- Table grid
- Headers for options
- Row labels for criteria
- Checkmarks, X's, or text in cells

**Source:** [Smartsheet - Pros and Cons Templates](https://www.smartsheet.com/content/pros-vs-cons-template), [Frill - Feature Prioritization Matrix](https://frill.co/blog/posts/feature-prioritization-matrix)

---

## Proactive Trigger Matrix

When should the AI draw WITHOUT being asked? Reference this matrix:

| User Says/Does | AI Should Draw |
|----------------|----------------|
| Lists 3+ related ideas | Mind map |
| Mentions "options" or "choices" | 2x2 matrix or comparison table |
| Asks "how does X work?" | User flow |
| Describes a problem | Fishbone diagram |
| Mentions timeline/phases | Timeline |
| Compares two things | Venn diagram or pros/cons |
| Describes a page/screen | Wireframe sketch |
| Lists unstructured brainstorm output | Affinity diagram |
| Settles on one idea to explore | Starbursting |
| Mentions business/revenue | Lean canvas |
| Asks "what questions should we ask?" | Starbursting |
| Describes a user scenario | Storyboard |
| Mentions categories | Tree diagram |
| Seems stuck on one perspective | Six thinking hats |

---

## Complexity Decision Framework

**Default to simple.** Elaborate only when:

1. **User explicitly requests more detail**
2. **Topic genuinely requires depth** (complex system, many interdependencies)
3. **User will iterate on the diagram** (not one-time reference)

**Warning signs to simplify:**
- Diagram takes >30 seconds to visually parse
- User asks "what am I looking at?"
- More than 50% of canvas is diagram
- Labels overlap or become unreadable

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It's Bad | Instead |
|--------------|--------------|---------|
| Drawing elaborate diagrams unprompted | Overwhelming; user didn't ask | Start simple, offer to expand |
| Using wrong technique for situation | Confuses rather than clarifies | Match technique to trigger |
| Multiple diagrams simultaneously | Cognitive overload | One diagram at a time |
| Over-decorating | Distracts from content | Hand-drawn aesthetic is fine |
| Forcing technique when user has own method | Breaks user's mental model | Adapt to user's framing |

---

## Cognitive Load Considerations

Visual diagrams reduce cognitive load by externalizing information from working memory. However:

- **Working memory limit:** ~4 unfamiliar items at once
- **Chunking helps:** Group related items visually
- **Labels matter:** Clear labels reduce parsing effort
- **Progressive disclosure:** Show summary first, detail on request

**Research support:** "By cognitively offloading the internal information as a rich picture, an individual can distribute the processing of that information to hopefully free up some cognitive resources." - [DTIC Research Note](https://apps.dtic.mil/sti/pdfs/AD1124593.pdf)

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Technique inventory | HIGH | Multiple authoritative sources (IxDF, NN/g, ASQ) |
| Trigger conditions | MEDIUM | Derived from established use cases, not empirical testing |
| Complexity guidance | MEDIUM | Based on UX principles, needs user testing |
| Excalidraw implementation | HIGH | Direct mapping to available shapes |

---

## Sources

### Brainstorming Techniques
- [SessionLab - 43 Brainstorming Techniques](https://www.sessionlab.com/blog/brainstorming-techniques/)
- [Asana - 29 Brainstorming Techniques](https://asana.com/resources/brainstorming-techniques)
- [Creately - Visual Brainstorming Techniques](https://creately.com/guides/visual-brainstorming-techniques/)
- [Excalidraw - Visual Brainstorming](https://plus.excalidraw.com/use-cases/visual-brainstorming)

### Design Thinking & Visual Thinking
- [IxDF - Essential Ideation Techniques](https://www.interaction-design.org/literature/article/introduction-to-the-essential-ideation-techniques-which-are-the-heart-of-design-thinking)
- [Lucidspark - Visual Thinking vs Design Thinking](https://lucid.co/blog/visual-thinking-vs-design-thinking)

### Specific Techniques
- [ProductPlan - 2x2 Prioritization Matrix](https://www.productplan.com/glossary/2x2-prioritization-matrix/)
- [ASQ - Fishbone Diagram](https://asq.org/quality-resources/fishbone)
- [ASQ - Affinity Diagram](https://asq.org/quality-resources/affinity)
- [NN/g - Prioritization Matrices](https://www.nngroup.com/articles/prioritization-matrices/)
- [NN/g - Wireflows](https://www.nngroup.com/articles/wireflows/)
- [De Bono Group - Six Thinking Hats](https://www.debonogroup.com/services/core-programs/six-thinking-hats/)

### Cognitive Load Research
- [DTIC Research - Visible Thinking](https://apps.dtic.mil/sti/pdfs/AD1124593.pdf)
- [PMC - Cognitive Mapping for Learning](https://pmc.ncbi.nlm.nih.gov/articles/PMC4994325/)
