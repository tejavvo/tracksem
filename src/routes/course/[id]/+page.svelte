<script lang="ts">
    import type { PageProps } from "./$types";
    import { grades, computeCompPct } from "$lib/stores/grades.svelte";
    import { getGradeColor, getLetterGrade } from "$lib/grading";
    import { tick } from "svelte";
    import { goto } from "$app/navigation";

    let { data }: PageProps = $props();

    const course = $derived(grades.getCourse(data.courseId));
    const proj = $derived(grades.projectedGrade(data.courseId));
    const totalWeight = $derived(grades.totalWeight(data.courseId));
    const filledWeight = $derived(
        course
            ? course.components.reduce(
                  (sum, comp) =>
                      computeCompPct(comp) !== null ? sum + comp.weight : sum,
                  0,
              )
            : 0,
    );
    const earnedWeight = $derived(
        course
            ? course.components.reduce((sum, comp) => {
                  const pct = computeCompPct(comp);
                  return pct !== null ? sum + (pct * comp.weight) / 100 : sum;
              }, 0)
            : 0,
    );

    let expanded = $state<Set<string>>(new Set());
    function toggle(id: string) {
        const next = new Set(expanded);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        expanded = next;
    }

    let confirmReset = $state(false);
    let editingName = $state<string | null>(null);
    let editingSubName = $state<string | null>(null);

    const gradeColor = $derived(getGradeColor(proj.grade));

    function handleScore(compId: string, val: string) {
        const num = val === "" ? null : parseFloat(val);
        if (num === null || (!isNaN(num) && num >= 0))
            grades.updateScore(data.courseId, compId, num);
    }

    function handleSubScore(compId: string, subId: string, val: string) {
        const num = val === "" ? null : parseFloat(val);
        if (num === null || (!isNaN(num) && num >= 0))
            grades.updateSubScore(data.courseId, compId, subId, num);
    }

    function handleSubMax(compId: string, subId: string, val: string) {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0)
            grades.updateSubMaxScore(data.courseId, compId, subId, num);
    }

    function handleWeight(compId: string, val: string) {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0 && num <= 100)
            grades.updateWeight(data.courseId, compId, num);
    }

    function handleMax(compId: string, val: string) {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0)
            grades.updateMaxScore(data.courseId, compId, num);
    }

    function handleBestOf(compId: string, val: string, total: number) {
        const num = parseInt(val);
        if (val === "" || isNaN(num))
            grades.updateBestOf(data.courseId, compId, undefined);
        else if (num > 0 && num <= total)
            grades.updateBestOf(data.courseId, compId, num);
    }

    let deletingCourse = $state(false);

    async function handleDeleteCourse() {
        if (deletingCourse) return;
        const name = course?.name ?? "this course";
        const ok = confirm(`Delete ${name}?`);
        if (!ok) return;
        deletingCourse = true;
        await grades.deleteCourse(data.courseId);
        goto("/");
    }

    function focusOnMount(node: HTMLElement) {
        tick().then(() => node.focus());
        return {};
    }
</script>

{#if course}
<div class="page">
    <header class="header">
        <div class="header-inner">
            <div class="nav-left">
                <button class="back-btn mono" onclick={() => goto("/")}
                    >← back</button
                >
                <div class="breadcrumb mono">
                    <span style="color: oklch(0.4 0.02 265)">tracksem /</span>
                    <span style="color: {course.color}">{course.name}</span>
                </div>
            </div>
            <div class="header-actions">
                {#if confirmReset}
                    <span class="mono text-xs" style="color: #fb923c"
                        >reset?</span
                    >
                    <button
                        class="action-btn danger mono text-xs"
                        onclick={async () => {
                            await grades.resetCourse(data.courseId);
                            confirmReset = false;
                        }}>yes</button
                    >
                    <button
                        class="action-btn mono text-xs"
                        onclick={() => (confirmReset = false)}>no</button
                    >
                {:else}
                    <button
                        class="action-btn mono text-xs"
                        onclick={() => (confirmReset = true)}>reset</button
                    >
                {/if}
                <button
                    class="action-btn danger mono text-xs"
                    disabled={deletingCourse}
                    onclick={handleDeleteCourse}
                    >{deletingCourse ? "deleting..." : "delete"}</button
                >
                <button
                    class="action-btn add mono text-xs"
                    onclick={() => grades.addComponent(data.courseId)}
                    >+ add</button
                >
            </div>
        </div>
    </header>

    <main class="main">
        <!-- Grade hero -->
        <div class="hero" style="--accent: {course.color}">
            <div class="hero-top-row">
                <div class="hero-left">
                    <div
                        class="course-chip mono"
                        style="color: {course.color}; border-color: {course.color}30"
                    >
                        {course.name}
                    </div>
                    <h1 class="course-fullname">{course.fullName}</h1>
                </div>
                <div class="hero-grade">
                    <div class="letter-grade mono" style="color: {gradeColor}">
                        {getLetterGrade(proj.grade)}
                    </div>
                    {#if proj.grade !== null}
                        <div class="pct-grade mono" style="color: {gradeColor}">
                            {proj.grade.toFixed(2)}%
                        </div>
                        <div class="grade-note">projected</div>
                    {:else}
                        <div class="grade-note">enter scores</div>
                    {/if}
                </div>
            </div>
            <div class="meta mono">
                {proj.filled}/{proj.total} graded
                {#if filledWeight > 0}
                    · <span class="earned-line">earned {earnedWeight.toFixed(1)}/{filledWeight.toFixed(0)}%</span>
                {:else}
                    · <span style="color: oklch(0.4 0.02 265)"
                        >no scores yet</span
                    >
                {/if}
                {#if totalWeight !== 100}
                    · <span style="color: #fb923c"
                        >⚠ {totalWeight}%</span
                    >
                {:else}
                    · <span style="color: oklch(0.4 0.02 265)"
                        >weights OK</span
                    >
                {/if}
            </div>
        </div>

        <div class="section-label mono">// components</div>

        <div class="comp-list">
            {#each course.components as comp (comp.id)}
                {@const pct = computeCompPct(comp)}
                {@const barColor = getGradeColor(pct)}
                {@const contrib =
                    pct !== null ? (pct * comp.weight) / 100 : null}
                {@const hasSubItems = comp.subItems && comp.subItems.length > 0}
                {@const isOpen = expanded.has(comp.id)}

                <div class="comp-card" class:expanded={isOpen}>
                    <div class="comp-row">
                        <!-- Expand toggle -->
                        <button
                            class="expand-btn"
                            class:has-sub={hasSubItems}
                            onclick={() => {
                                if (hasSubItems) {
                                    toggle(comp.id);
                                } else {
                                    grades.addSubItem(data.courseId, comp.id);
                                    expanded = new Set([...expanded, comp.id]);
                                }
                            }}
                        >
                            {#if hasSubItems}
                                <span class="chevron mono" class:open={isOpen}
                                    >›</span
                                >
                            {:else}
                                <span
                                    class="plus-expand mono"
                                    title="add sub-items">⊕</span
                                >
                            {/if}
                        </button>

                        <!-- Name -->
                        <div class="comp-name-cell">
                            {#if editingName === comp.id}
                                <input
                                    class="name-input mono"
                                    value={comp.name}
                                    use:focusOnMount
                                    onblur={(e) => {
                                        grades.updateName(
                                            data.courseId,
                                            comp.id,
                                            (e.target as HTMLInputElement)
                                                .value,
                                        );
                                        editingName = null;
                                    }}
                                    onkeydown={(e) => {
                                        if (e.key === "Enter")
                                            (
                                                e.target as HTMLInputElement
                                            ).blur();
                                    }}
                                />
                            {:else}
                                <button
                                    class="name-display mono"
                                    onclick={() => (editingName = comp.id)}
                                >
                                    {comp.name}
                                    {#if hasSubItems}
                                        <span class="sub-count">
                                            {comp.subItems!.filter(
                                                (s) => s.score !== null,
                                            ).length}/{comp.subItems!.length}
                                            {#if comp.bestOf}· best {comp.bestOf}{/if}
                                        </span>
                                    {/if}
                                    <span class="edit-hint">✏</span>
                                </button>
                            {/if}
                        </div>

                        <!-- Remove (mobile: top-right) -->
                        <button
                            class="remove-btn"
                            onclick={() =>
                                grades.removeComponent(data.courseId, comp.id)}
                            title="remove">×</button
                        >
                    </div>

                    <!-- Values row (weight, score, pct, contrib) -->
                    <div class="comp-values-row">
                        <!-- Weight -->
                        <div class="comp-cell weight-cell">
                            <span class="cell-label mono">wt</span>
                            <input
                                class="num-input mono"
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={comp.weight}
                                oninput={(e) =>
                                    handleWeight(
                                        comp.id,
                                        (e.target as HTMLInputElement).value,
                                    )}
                            />
                            <span class="unit mono">%</span>
                        </div>

                        <!-- Score -->
                        <div class="comp-cell score-cell">
                            {#if !hasSubItems}
                                <span class="cell-label mono">score</span>
                                <input
                                    class="num-input mono score-input"
                                    type="number"
                                    min="0"
                                    max={comp.maxScore}
                                    step="0.5"
                                    placeholder="—"
                                    value={comp.score ?? ""}
                                    oninput={(e) =>
                                        handleScore(
                                            comp.id,
                                            (e.target as HTMLInputElement)
                                                .value,
                                        )}
                                />
                                <span class="unit mono">/ </span>
                                <input
                                    class="num-input mono max-input"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={comp.maxScore}
                                    oninput={(e) =>
                                        handleMax(
                                            comp.id,
                                            (e.target as HTMLInputElement)
                                                .value,
                                        )}
                                />
                            {:else}
                                <button
                                    class="sub-summary mono"
                                    onclick={() => toggle(comp.id)}
                                >
                                    {isOpen ? "▾" : "▸"}
                                    {comp.subItems!.filter(
                                        (s) => s.score !== null,
                                    ).length} of {comp.subItems!.length} entered
                                </button>
                            {/if}
                        </div>

                        <!-- Pct + bar -->
                        <div class="comp-cell pct-cell">
                            {#if pct !== null}
                                <div class="bar-stack">
                                    <div class="bar-track">
                                        <div
                                            class="bar-fill"
                                            style="width: {Math.min(
                                                pct,
                                                100,
                                            )}%; background: {barColor}"
                                        ></div>
                                    </div>
                                    <span
                                        class="mono text-xs"
                                        style="color: {barColor}"
                                        >{pct.toFixed(1)}%</span
                                    >
                                </div>
                            {:else}
                                <span class="mono text-xs dimmed">—</span>
                            {/if}
                        </div>

                        <!-- Contribution -->
                        <div
                            class="comp-cell contrib-cell mono text-xs"
                            style="color: {contrib !== null
                                ? barColor
                                : 'oklch(0.35 0.02 265)'}"
                        >
                            {contrib !== null ? contrib.toFixed(2) + "%" : "—"}
                        </div>
                    </div>

                    <!-- Sub-items panel -->
                    {#if hasSubItems && isOpen}
                        <div class="sub-panel">
                            <div class="best-of-row mono">
                                <span class="dimmed">scoring:</span>
                                {#if comp.bestOf !== undefined}
                                    <span class="best-of-inline">best
                                    <input
                                        class="bestof-input mono"
                                        type="number"
                                        min="1"
                                        max={comp.subItems!.length}
                                        value={comp.bestOf}
                                        oninput={(e) =>
                                            handleBestOf(
                                                comp.id,
                                                (e.target as HTMLInputElement)
                                                    .value,
                                                comp.subItems!.length,
                                            )}
                                    />
                                    of {comp.subItems!.length}</span>
                                    <button
                                        class="pill-btn mono"
                                        onclick={() =>
                                            grades.updateBestOf(
                                                data.courseId,
                                                comp.id,
                                                undefined,
                                            )}>→ all</button
                                    >
                                {:else}
                                    <span class="best-of-inline">avg of all {comp.subItems!.length}</span>
                                    <button
                                        class="pill-btn mono"
                                        onclick={() =>
                                            grades.updateBestOf(
                                                data.courseId,
                                                comp.id,
                                                Math.max(
                                                    1,
                                                    comp.subItems!.length - 1,
                                                ),
                                            )}>→ best-of</button
                                    >
                                {/if}
                                <span class="dimmed best-of-worth"
                                    >each {comp.subItems!.length > 0
                                        ? (
                                              comp.weight /
                                              comp.subItems!.length
                                          ).toFixed(1)
                                        : "0"}%</span
                                >
                            </div>

                            {#each comp.subItems! as sub (sub.id)}
                                {@const subPct =
                                    sub.score !== null
                                        ? (sub.score / sub.maxScore) * 100
                                        : null}
                                {@const subColor = getGradeColor(subPct)}
                                <div class="sub-row">
                                    <div class="sub-top-row">
                                        <div class="sub-name-cell">
                                            {#if editingSubName === sub.id}
                                                <input
                                                    class="name-input mono"
                                                    value={sub.name}
                                                    use:focusOnMount
                                                    onblur={(e) => {
                                                        grades.updateSubName(
                                                            data.courseId,
                                                            comp.id,
                                                            sub.id,
                                                            (
                                                                e.target as HTMLInputElement
                                                            ).value,
                                                        );
                                                        editingSubName = null;
                                                    }}
                                                    onkeydown={(e) => {
                                                        if (e.key === "Enter")
                                                            (
                                                                e.target as HTMLInputElement
                                                            ).blur();
                                                    }}
                                                />
                                            {:else}
                                                <button
                                                    class="name-display mono small"
                                                    onclick={() =>
                                                        (editingSubName = sub.id)}
                                                >
                                                    {sub.name}<span
                                                        class="edit-hint">✏</span
                                                    >
                                                </button>
                                            {/if}
                                        </div>

                                        <button
                                            class="remove-btn small"
                                            onclick={() =>
                                                grades.removeSubItem(
                                                    data.courseId,
                                                    comp.id,
                                                    sub.id,
                                                )}
                                            title="remove">×</button
                                        >
                                    </div>

                                    <div class="sub-bottom-row">
                                        <div class="sub-score-cell">
                                            <input
                                                class="num-input mono score-input"
                                                type="number"
                                                min="0"
                                                max={sub.maxScore}
                                                step="0.5"
                                                placeholder="—"
                                                value={sub.score ?? ""}
                                                oninput={(e) =>
                                                    handleSubScore(
                                                        comp.id,
                                                        sub.id,
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).value,
                                                    )}
                                            />
                                            <span class="unit mono">/ </span>
                                            <input
                                                class="num-input mono max-input"
                                                type="number"
                                                min="1"
                                                step="1"
                                                value={sub.maxScore}
                                                oninput={(e) =>
                                                    handleSubMax(
                                                        comp.id,
                                                        sub.id,
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).value,
                                                    )}
                                            />
                                        </div>

                                        <div class="sub-pct-cell">
                                            {#if subPct !== null}
                                                <span
                                                    class="mono text-xs"
                                                    style="color: {subColor}"
                                                    >{subPct.toFixed(1)}%</span
                                                >
                                            {:else}
                                                <span class="dimmed mono text-xs"
                                                    >—</span
                                                >
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/each}

                            <button
                                class="add-sub-btn mono"
                                onclick={() =>
                                    grades.addSubItem(data.courseId, comp.id)}
                            >
                                + add {comp.name.toLowerCase()}
                            </button>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>

        <div class="totals mono">
            <span
                >total weight: <strong
                    style="color: {totalWeight === 100 ? '#4ade80' : '#fb923c'}"
                    >{totalWeight}%</strong
                ></span
            >
            {#if proj.grade !== null}
                <span
                    >projected total: <strong
                        style="color: {getGradeColor(proj.grade)}"
                        >{((proj.grade * totalWeight) / 100).toFixed(
                            2,
                        )}%</strong
                    ></span
                >
            {/if}
        </div>

        <button
            class="add-full-btn mono"
            onclick={() => grades.addComponent(data.courseId)}
            >+ add component</button
        >
    </main>
</div>
{:else}
<div class="page">
    <main class="main">
        <div class="section-label mono">course not found</div>
        <button class="back-btn mono" onclick={() => goto("/")}>← back</button>
    </main>
</div>
{/if}

<style>
    .page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .header {
        border-bottom: 1px solid oklch(1 0 0 / 7%);
        padding: 0.875rem 2rem;
        position: sticky;
        top: 0;
        background: oklch(0.08 0.02 265 / 90%);
        backdrop-filter: blur(12px);
        z-index: 50;
    }

    .header-inner {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 0.5rem;
    }
    .nav-left {
        display: flex;
        align-items: center;
        gap: 1rem;
        min-width: 0;
    }

    .back-btn {
        font-size: 0.75rem;
        color: oklch(0.5 0.02 265);
        background: none;
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 5px;
        padding: 0.3rem 0.7rem;
        cursor: pointer;
        flex-shrink: 0;
        transition:
            color 0.15s,
            border-color 0.15s;
    }
    .back-btn:hover {
        color: oklch(0.85 0.01 265);
        border-color: oklch(1 0 0 / 20%);
    }
    .breadcrumb {
        font-size: 0.75rem;
        display: flex;
        gap: 0.4rem;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        flex-shrink: 0;
    }

    .action-btn {
        background: oklch(1 0 0 / 5%);
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 5px;
        padding: 0.3rem 0.7rem;
        color: oklch(0.7 0.02 265);
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s;
    }
    .action-btn:hover {
        background: oklch(1 0 0 / 10%);
        color: oklch(0.9 0.01 265);
    }
    .action-btn.danger:hover {
        color: #f87171;
        border-color: #f8717140;
    }
    .action-btn.add {
        color: #4ade80;
        border-color: #4ade8030;
    }
    .action-btn.add:hover {
        background: #4ade8015;
    }

    .main {
        max-width: 1100px;
        width: 100%;
        margin: 0 auto;
        padding: 2rem;
        flex: 1;
    }

    /* Hero */
    .hero {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: oklch(0.12 0.025 265);
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 10px;
        position: relative;
        overflow: hidden;
    }
    .hero::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
            90deg,
            transparent,
            var(--accent) 50%,
            transparent
        );
        opacity: 0.5;
    }
    .hero-top-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 1rem;
    }
    .hero-left {
        min-width: 0;
        flex: 1;
    }
    .course-chip {
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        border: 1px solid;
        border-radius: 4px;
        padding: 0.12rem 0.45rem;
        display: inline-block;
        margin-bottom: 0.5rem;
    }
    .course-fullname {
        font-size: 1.4rem;
        font-weight: 600;
        letter-spacing: -0.02em;
        margin: 0;
    }
    .meta {
        font-size: 0.7rem;
        color: oklch(0.5 0.02 265);
        line-height: 1.6;
    }
    .earned-line {
        font-size: 0.95rem;
        font-weight: 700;
        color: oklch(0.9 0.01 265);
        letter-spacing: -0.01em;
    }
    .hero-grade {
        text-align: right;
        flex-shrink: 0;
    }
    .letter-grade {
        font-size: 3.5rem;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.04em;
    }
    .pct-grade {
        font-size: 1.1rem;
        font-weight: 600;
        margin-top: 0.2rem;
    }
    .grade-note {
        font-size: 0.65rem;
        color: oklch(0.45 0.02 265);
        margin-top: 0.25rem;
    }

    .section-label {
        font-size: 0.65rem;
        font-family: "JetBrains Mono", monospace;
        color: oklch(0.38 0.02 265);
        letter-spacing: 0.05em;
        margin-bottom: 0.75rem;
    }

    /* Component list */
    .comp-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }
    .comp-card {
        background: oklch(0.12 0.025 265);
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 8px;
        overflow: hidden;
        transition: border-color 0.15s;
    }
    .comp-card.expanded {
        border-color: oklch(1 0 0 / 14%);
    }

    /* Top row: expand + name + remove */
    .comp-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.65rem 0.75rem;
        padding-bottom: 0;
        min-height: 36px;
    }

    /* Values row: weight, score, pct, contrib */
    .comp-values-row {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        align-items: center;
        gap: 0.5rem;
        padding: 0.35rem 0.75rem 0.65rem;
    }

    .cell-label {
        display: none;
        font-size: 0.6rem;
        color: oklch(0.4 0.02 265);
        letter-spacing: 0.05em;
        text-transform: uppercase;
    }

    /* Expand button */
    .expand-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 28px;
    }
    .expand-btn.has-sub {
        cursor: pointer;
    }
    .chevron {
        font-size: 1.1rem;
        color: oklch(0.45 0.02 265);
        display: inline-block;
        transition:
            transform 0.2s,
            color 0.15s;
        line-height: 1;
    }
    .chevron.open {
        transform: rotate(90deg);
        color: oklch(0.7 0.02 265);
    }
    .plus-expand {
        font-size: 0.95rem;
        color: oklch(0.3 0.02 265);
        display: inline-block;
        transition: color 0.15s;
        line-height: 1;
    }
    .expand-btn:hover .plus-expand {
        color: #4ade80;
    }

    /* Name */
    .comp-name-cell {
        overflow: hidden;
        flex: 1;
        min-width: 0;
    }
    .name-display {
        background: none;
        border: none;
        color: oklch(0.85 0.01 265);
        font-size: 0.8rem;
        font-family: "JetBrains Mono", monospace;
        cursor: pointer;
        padding: 0.15rem 0.35rem;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: background 0.1s;
        max-width: 100%;
    }
    .name-display.small {
        font-size: 0.72rem;
        color: oklch(0.75 0.01 265);
    }
    .name-display:hover {
        background: oklch(1 0 0 / 6%);
    }
    .sub-count {
        font-size: 0.6rem;
        color: oklch(0.45 0.02 265);
        padding: 0.1rem 0.35rem;
        background: oklch(1 0 0 / 6%);
        border-radius: 10px;
    }
    .edit-hint {
        opacity: 0;
        font-size: 0.6rem;
        transition: opacity 0.15s;
    }
    .name-display:hover .edit-hint {
        opacity: 0.5;
    }
    .name-input {
        background: oklch(1 0 0 / 8%);
        border: 1px solid oklch(1 0 0 / 15%);
        border-radius: 4px;
        color: oklch(0.92 0.01 265);
        font-size: 0.8rem;
        padding: 0.15rem 0.4rem;
        width: 95%;
        outline: none;
    }
    .name-input:focus {
        border-color: #22d3ee60;
    }

    /* Cells */
    .comp-cell {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
    .weight-cell {
        justify-content: flex-end;
    }
    .score-cell {
        justify-content: flex-end;
    }
    .pct-cell {
        justify-content: flex-end;
    }
    .contrib-cell {
        justify-content: flex-end;
    }

    .num-input {
        background: oklch(1 0 0 / 5%);
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 4px;
        color: oklch(0.85 0.01 265);
        font-size: 0.75rem;
        padding: 0.2rem 0.35rem;
        width: 56px;
        text-align: right;
        outline: none;
        transition: border-color 0.15s;
    }
    .num-input:focus {
        border-color: #22d3ee50;
    }
    .num-input::-webkit-outer-spin-button,
    .num-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
    }
    .num-input[type="number"] {
        -moz-appearance: textfield;
        appearance: textfield;
    }
    .score-input {
        border-color: #22d3ee25;
        color: #22d3ee;
    }
    .score-input:focus {
        border-color: #22d3ee80;
    }
    .max-input {
        width: 46px;
    }
    .unit {
        font-size: 0.7rem;
        color: oklch(0.4 0.02 265);
    }
    .sub-summary {
        font-size: 0.7rem;
        color: oklch(0.5 0.02 265);
        background: none;
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 4px;
        padding: 0.2rem 0.5rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .sub-summary:hover {
        border-color: oklch(1 0 0 / 18%);
        color: oklch(0.7 0.02 265);
    }
    .bar-stack {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.2rem;
        width: 100%;
        min-width: 60px;
    }
    .bar-track {
        width: 100%;
        height: 3px;
        background: oklch(1 0 0 / 6%);
        border-radius: 2px;
        overflow: hidden;
    }
    .bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.35s ease;
    }
    .dimmed {
        color: oklch(0.35 0.02 265);
    }

    .remove-btn {
        background: none;
        border: none;
        color: oklch(0.35 0.02 265);
        font-size: 1rem;
        cursor: pointer;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        line-height: 1;
        flex-shrink: 0;
        transition:
            color 0.15s,
            background 0.15s;
    }
    .remove-btn:hover {
        color: #f87171;
        background: #f8717115;
    }
    .remove-btn.small {
        font-size: 0.85rem;
    }

    /* Sub-items panel */
    .sub-panel {
        border-top: 1px solid oklch(1 0 0 / 7%);
        padding: 0.5rem 0.75rem 0.75rem 2.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        background: oklch(0.1 0.02 265);
    }
    .best-of-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        flex-wrap: wrap;
        font-size: 0.7rem;
        color: oklch(0.65 0.02 265);
        padding: 0.4rem 0;
        border-bottom: 1px solid oklch(1 0 0 / 6%);
        margin-bottom: 0.25rem;
    }
    .best-of-inline {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
    }
    .best-of-worth {
        margin-left: auto;
    }
    .bestof-input {
        width: 40px;
        padding: 0.1rem 0.25rem;
        font-size: 0.7rem;
        background: oklch(1 0 0 / 8%);
        border: 1px solid oklch(1 0 0 / 15%);
        border-radius: 4px;
        color: #fbbf24;
        text-align: center;
        outline: none;
    }
    .bestof-input::-webkit-outer-spin-button,
    .bestof-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
    }
    .bestof-input[type="number"] {
        -moz-appearance: textfield;
        appearance: textfield;
    }
    .pill-btn {
        background: oklch(1 0 0 / 6%);
        border: 1px solid oklch(1 0 0 / 12%);
        border-radius: 10px;
        color: oklch(0.6 0.02 265);
        font-size: 0.65rem;
        padding: 0.1rem 0.5rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .pill-btn:hover {
        background: oklch(1 0 0 / 12%);
        color: oklch(0.85 0.01 265);
    }

    /* Sub-row: now uses flex layout for mobile-friendliness */
    .sub-row {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.4rem 0.25rem;
        border-radius: 5px;
        transition: background 0.1s;
    }
    .sub-row:hover {
        background: oklch(1 0 0 / 3%);
    }
    .sub-top-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .sub-bottom-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .sub-name-cell {
        overflow: hidden;
        flex: 1;
        min-width: 0;
    }
    .sub-score-cell {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        justify-content: flex-end;
    }
    .sub-pct-cell {
        text-align: right;
        flex-shrink: 0;
    }
    .add-sub-btn {
        margin-top: 0.35rem;
        padding: 0.4rem;
        background: none;
        border: 1px dashed oklch(1 0 0 / 10%);
        border-radius: 6px;
        color: oklch(0.45 0.02 265);
        font-size: 0.7rem;
        cursor: pointer;
        text-align: left;
        transition: all 0.15s;
    }
    .add-sub-btn:hover {
        border-color: #4ade8030;
        color: #4ade80;
        background: #4ade8008;
    }

    /* Totals */
    .totals {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: oklch(0.1 0.02 265);
        border: 1px solid oklch(1 0 0 / 6%);
        border-radius: 6px;
        font-size: 0.72rem;
        color: oklch(0.5 0.02 265);
        display: flex;
        flex-wrap: wrap;
        gap: 1rem 2rem;
    }
    .add-full-btn {
        width: 100%;
        margin-top: 0.75rem;
        padding: 0.65rem;
        background: oklch(1 0 0 / 3%);
        border: 1px dashed oklch(1 0 0 / 12%);
        border-radius: 8px;
        color: oklch(0.5 0.02 265);
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .add-full-btn:hover {
        background: #4ade8010;
        border-color: #4ade8030;
        color: #4ade80;
    }

    /* ── Desktop: restore the original inline grid layout ─── */
    @media (min-width: 769px) {
        .comp-row {
            display: grid;
            grid-template-columns: 28px 1fr 32px;
            padding-bottom: 0;
        }

        .comp-values-row {
            grid-template-columns: 100px 180px 140px 70px;
            padding-left: calc(0.75rem + 28px + 0.5rem);
        }

        .sub-row {
            flex-direction: row;
            align-items: center;
        }
        .sub-top-row {
            flex: 1;
            min-width: 0;
        }
        .sub-bottom-row {
            flex-shrink: 0;
        }
    }

    /* ── Mobile-specific styles ─────────────── */
    @media (max-width: 768px) {
        .header {
            padding: 0.75rem 0.75rem;
        }

        .header-inner {
            flex-wrap: wrap;
            gap: 0.5rem;
        }

        .nav-left {
            width: 100%;
            gap: 0.5rem;
        }

        .breadcrumb {
            font-size: 0.68rem;
        }

        .header-actions {
            width: 100%;
            flex-wrap: wrap;
            gap: 0.35rem;
        }

        .action-btn {
            padding: 0.25rem 0.5rem;
            font-size: 0.65rem;
        }

        .main {
            padding: 1rem 0.75rem;
        }

        /* Hero mobile */
        .hero {
            padding: 1rem;
            margin-bottom: 1.25rem;
        }

        .hero-top-row {
            gap: 0.5rem;
        }

        .course-fullname {
            font-size: 1.1rem;
        }

        .letter-grade {
            font-size: 2.5rem;
        }

        .pct-grade {
            font-size: 0.9rem;
        }

        .meta {
            font-size: 0.65rem;
        }

        /* Component cards mobile — stack vertically */
        .comp-row {
            display: flex;
            flex-wrap: nowrap;
            gap: 0.35rem;
            padding: 0.5rem 0.6rem;
            padding-bottom: 0.15rem;
        }

        .comp-values-row {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            padding: 0.25rem 0.6rem 0.5rem;
        }

        .cell-label {
            display: inline;
        }

        .weight-cell {
            justify-content: flex-start;
        }

        .score-cell {
            justify-content: flex-start;
        }

        .pct-cell {
            flex: 1;
            min-width: 60px;
        }

        .contrib-cell {
            justify-content: flex-start;
        }

        .bar-stack {
            min-width: 50px;
        }

        .num-input {
            width: 48px;
            font-size: 0.72rem;
            padding: 0.25rem 0.3rem;
        }

        .max-input {
            width: 40px;
        }

        .name-display {
            font-size: 0.75rem;
        }

        .sub-count {
            font-size: 0.55rem;
        }

        /* Sub-panel mobile */
        .sub-panel {
            padding: 0.5rem 0.5rem 0.75rem 1rem;
        }

        .best-of-row {
            font-size: 0.65rem;
            gap: 0.3rem;
        }

        .best-of-worth {
            margin-left: 0;
            width: 100%;
        }

        .sub-row {
            flex-direction: column;
            gap: 0.2rem;
            padding: 0.3rem 0.2rem;
        }

        .sub-top-row {
            width: 100%;
        }

        .sub-bottom-row {
            width: 100%;
            padding-left: 0;
        }

        .sub-score-cell {
            flex: 1;
        }

        .name-display.small {
            font-size: 0.68rem;
        }

        /* Totals mobile */
        .totals {
            gap: 0.5rem 1rem;
        }
    }

    /* Extra-small screens */
    @media (max-width: 400px) {
        .header {
            padding: 0.6rem 0.5rem;
        }

        .main {
            padding: 0.75rem 0.5rem;
        }

        .hero {
            padding: 0.75rem;
        }

        .course-fullname {
            font-size: 1rem;
        }

        .letter-grade {
            font-size: 2rem;
        }

        .comp-row {
            padding: 0.4rem 0.5rem;
        }

        .comp-values-row {
            padding: 0.25rem 0.5rem 0.5rem;
        }

        .num-input {
            width: 44px;
            font-size: 0.68rem;
        }

        .max-input {
            width: 36px;
        }
    }
</style>
